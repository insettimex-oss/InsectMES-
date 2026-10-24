<?php

namespace App\Http\Controllers;

use App\Models\Parameter;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MesCostController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function createRate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:cost_rates,code'],
            'name' => ['required', 'string', 'max:180'],
            'category' => ['required', Rule::in(['MATERIAL', 'LABOR', 'ENERGY', 'OVERHEAD', 'COPRODUCT_CREDIT'])],
            'part_id' => ['nullable', 'exists:parts,id'],
            'work_center_id' => ['nullable', 'exists:work_centers,id'],
            'unit_cost' => ['required', 'numeric', 'gte:0'],
            'unit' => ['required', 'string', 'max:30'],
            'effective_from' => ['required', 'date'],
            'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
        ]);
        if ($data['category'] === 'MATERIAL' && empty($data['part_id'])) {
            throw ValidationException::withMessages(['part_id' => 'La tarifa de material debe indicar un artículo.']);
        }

        $id = DB::table('cost_rates')->insertGetId([
            ...$data,
            'part_id' => $data['part_id'] ?? null,
            'work_center_id' => $data['work_center_id'] ?? null,
            'effective_to' => $data['effective_to'] ?? null,
            'active' => true,
            'created_by' => $request->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->audit->record($request, 'COST_RATE_CREATED', 'cost_rates', 'Alta de tarifa efectiva', null, $data, $id);

        return $this->success('Tarifa creada y disponible para costeo real.');
    }

    public function recordEntry(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'production_order_id' => ['required', 'exists:production_orders,id'],
            'cost_rate_id' => ['required', 'exists:cost_rates,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'description' => ['required', 'string', 'max:255'],
            'occurred_at' => ['required', 'date'],
        ]);

        $entry = DB::transaction(function () use ($data, $request): object {
            $summary = DB::table('production_lot_costs')->where('production_order_id', $data['production_order_id'])->lockForUpdate()->first();
            abort_if($summary?->status === 'CLOSED', 422, 'El costo del lote está cerrado y ya no admite movimientos.');
            $rate = DB::table('cost_rates')->where('id', $data['cost_rate_id'])->where('active', true)->first();
            abort_if($rate === null, 422, 'La tarifa ya no está activa.');
            $amount = round((float) $data['quantity'] * (float) $rate->unit_cost, 4);
            if ($rate->category === 'COPRODUCT_CREDIT') {
                $amount *= -1;
            }
            $id = DB::table('production_cost_entries')->insertGetId([
                'production_order_id' => $data['production_order_id'],
                'category' => $rate->category,
                'source_type' => 'MANUAL',
                'quantity' => $data['quantity'],
                'unit' => $rate->unit,
                'unit_cost' => $rate->unit_cost,
                'amount' => $amount,
                'description' => $data['description'],
                'recorded_by' => $request->user()->id,
                'occurred_at' => $data['occurred_at'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->audit->record($request, 'ACTUAL_COST_RECORDED', 'production_cost_entries', $data['description'], null, ['rate' => $rate->code, 'amount' => $amount, ...$data], $id);

            return (object) ['id' => $id, 'amount' => $amount];
        });

        return $this->success('Movimiento de costo registrado por '.number_format((float) $entry->amount, 2).' MXN.');
    }

    public function calculate(Request $request, int $order): RedirectResponse
    {
        $summary = DB::transaction(function () use ($order, $request): object {
            $productionOrder = DB::table('production_orders')->where('id', $order)->lockForUpdate()->first();
            abort_if($productionOrder === null || $productionOrder->status === 'CANCELLED', 422, 'La orden no está disponible para costeo.');
            $existing = DB::table('production_lot_costs')->where('production_order_id', $order)->lockForUpdate()->first();
            abort_if($existing?->status === 'CLOSED', 422, 'El costo del lote ya está cerrado.');

            DB::table('production_cost_entries')->where('production_order_id', $order)->whereIn('source_type', ['LABOR_AUTO', 'FEEDING_AUTO'])->delete();
            $this->calculateLabor($order, $request->user()->id);
            $this->calculateFeeding($order, $request->user()->id);

            $totals = DB::table('production_cost_entries')->where('production_order_id', $order)->select('category', DB::raw('sum(amount) as total'))->groupBy('category')->pluck('total', 'category');
            $material = (float) ($totals['MATERIAL'] ?? 0);
            $labor = (float) ($totals['LABOR'] ?? 0);
            $energy = (float) ($totals['ENERGY'] ?? 0);
            $overhead = (float) ($totals['OVERHEAD'] ?? 0);
            $credit = abs((float) ($totals['COPRODUCT_CREDIT'] ?? 0));
            $net = round($material + $labor + $energy + $overhead - $credit, 4);
            $output = (float) $productionOrder->completed_quantity;
            if ($output <= 0) {
                $output = (float) DB::table('production_runs')->where('production_order_id', $order)->where('operation_id', function ($query) use ($productionOrder): void {
                    $query->select('id')->from('operations')->where('output_part_id', $productionOrder->part_id)->orderByDesc('sort_order')->limit(1);
                })->sum('quantity_out');
            }
            $values = [
                'material_cost' => $material,
                'labor_cost' => $labor,
                'energy_cost' => $energy,
                'overhead_cost' => $overhead,
                'coproduct_credit' => $credit,
                'net_cost' => $net,
                'output_quantity' => $output,
                'unit' => $productionOrder->unit,
                'unit_cost' => $output > 0 ? round($net / $output, 6) : 0,
                'status' => 'DRAFT',
                'calculated_by' => $request->user()->id,
                'calculated_at' => now(),
                'updated_at' => now(),
            ];
            if ($existing) {
                DB::table('production_lot_costs')->where('production_order_id', $order)->update($values);
            } else {
                DB::table('production_lot_costs')->insert(['production_order_id' => $order, ...$values, 'created_at' => now()]);
            }
            $this->audit->record($request, 'LOT_COST_CALCULATED', 'production_lot_costs', 'Recálculo de costo real con captura y datos de ejecución', $existing ? (array) $existing : null, $values, $order);

            return (object) $values;
        });

        return $this->success('Costo real recalculado: '.number_format((float) $summary->net_cost, 2).' MXN.');
    }

    public function close(Request $request, int $order): RedirectResponse
    {
        $data = $request->validate(['closure_notes' => ['required', 'string', 'min:10', 'max:2000']]);
        DB::transaction(function () use ($order, $data, $request): void {
            $productionOrder = DB::table('production_orders')->where('id', $order)->lockForUpdate()->first();
            $summary = DB::table('production_lot_costs')->where('production_order_id', $order)->lockForUpdate()->first();
            abort_if($productionOrder === null || $productionOrder->status !== 'COMPLETED', 422, 'La orden debe estar completada para cerrar su costo.');
            abort_if($summary === null || $summary->status === 'CLOSED' || (float) $summary->output_quantity <= 0, 422, 'Calcule un costo con producción real antes de cerrarlo.');
            DB::table('production_lot_costs')->where('production_order_id', $order)->update([
                'status' => 'CLOSED',
                'closure_notes' => $data['closure_notes'],
                'closed_by' => $request->user()->id,
                'closed_at' => now(),
                'updated_at' => now(),
            ]);
            $this->audit->record($request, 'LOT_COST_CLOSED', 'production_lot_costs', $data['closure_notes'], ['status' => $summary->status], ['status' => 'CLOSED', 'unit_cost' => $summary->unit_cost], $summary->id);
        });

        return $this->success('Costo real del lote cerrado y protegido contra cambios.');
    }

    private function calculateLabor(int $order, int $userId): void
    {
        $defaultRate = (float) (Parameter::query()->where('code', 'LABOR')->value('value') ?? 0);
        $operations = DB::table('production_order_operations as po')
            ->join('operations as o', 'o.id', '=', 'po.operation_id')
            ->leftJoin('work_centers as w', 'w.id', '=', 'o.work_center_id')
            ->where('po.production_order_id', $order)->where('po.active_minutes', '>', 0)
            ->get(['po.id', 'po.active_minutes', 'o.name', 'o.work_center_id', 'w.code as work_center']);
        foreach ($operations as $operation) {
            $unitCost = $this->activeRate('LABOR', null, $operation->work_center_id) ?? $defaultRate;
            $hours = round((float) $operation->active_minutes / 60, 4);
            DB::table('production_cost_entries')->insert([
                'production_order_id' => $order,
                'category' => 'LABOR',
                'source_type' => 'LABOR_AUTO',
                'source_id' => (string) $operation->id,
                'quantity' => $hours,
                'unit' => 'h',
                'unit_cost' => $unitCost,
                'amount' => round($hours * $unitCost, 4),
                'description' => "{$operation->name} · {$operation->work_center}",
                'recorded_by' => $userId,
                'occurred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function calculateFeeding(int $order, int $userId): void
    {
        $events = DB::table('feeding_events as f')->join('containers as c', 'c.id', '=', 'f.substrate_container_id')->join('parts as p', 'p.id', '=', 'c.part_id')->where('f.production_order_id', $order)->get(['f.id', 'f.quantity', 'f.unit', 'f.occurred_at', 'c.part_id', 'p.code', 'p.description']);
        foreach ($events as $event) {
            $fallbackCode = $event->code === 'PREMIUM-FEED' ? 'PREMIUM_COST' : 'FEED_COST';
            $unitCost = $this->activeRate('MATERIAL', $event->part_id, null) ?? (float) (Parameter::query()->where('code', $fallbackCode)->value('value') ?? 0);
            DB::table('production_cost_entries')->insert([
                'production_order_id' => $order,
                'category' => 'MATERIAL',
                'source_type' => 'FEEDING_AUTO',
                'source_id' => (string) $event->id,
                'quantity' => $event->quantity,
                'unit' => $event->unit,
                'unit_cost' => $unitCost,
                'amount' => round((float) $event->quantity * $unitCost, 4),
                'description' => "Alimentación {$event->code} · {$event->description}",
                'recorded_by' => $userId,
                'occurred_at' => $event->occurred_at,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function activeRate(string $category, int|string|null $partId, int|string|null $workCenterId): ?float
    {
        $value = DB::table('cost_rates')->where('category', $category)->where('active', true)
            ->whereDate('effective_from', '<=', today())
            ->where(fn ($query) => $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', today()))
            ->when($partId !== null, fn ($query) => $query->where('part_id', $partId))
            ->when($workCenterId !== null, fn ($query) => $query->where(fn ($inner) => $inner->where('work_center_id', $workCenterId)->orWhereNull('work_center_id')))
            ->orderByRaw('CASE WHEN work_center_id IS NULL THEN 1 ELSE 0 END')
            ->orderByDesc('effective_from')->value('unit_cost');

        return $value === null ? null : (float) $value;
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
