<?php

namespace App\Http\Controllers;

use App\Models\Container;
use App\Models\EnvironmentalLimit;
use App\Models\ProductionOrder;
use App\Models\QualitySpecification;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MesP0Controller extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function createOrder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'part_id' => ['required', 'exists:parts,id'],
            'planned_quantity' => ['required', 'numeric', 'gt:0'],
            'priority' => ['required', Rule::in(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])],
            'scheduled_start' => ['required', 'date'],
            'scheduled_end' => ['nullable', 'date', 'after_or_equal:scheduled_start'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $part = DB::table('parts')->where('id', $data['part_id'])->where('active', true)->first();
        if ($part === null) {
            throw ValidationException::withMessages([
                'part_id' => 'La parte seleccionada no está disponible.',
            ]);
        }

        $routes = DB::table('process_routes')->where('part_id', $part->id)->orderBy('sequence')->get();
        if ($routes->isEmpty()) {
            throw ValidationException::withMessages([
                'part_id' => 'Selecciona un producto que tenga una ruta de proceso aprobada.',
            ]);
        }

        $order = DB::transaction(function () use ($data, $request, $part, $routes): ProductionOrder {
            $number = 'OP-'.now()->format('Y').'-'.str_pad((string) (ProductionOrder::whereYear('created_at', now()->year)->count() + 1), 4, '0', STR_PAD_LEFT);
            $order = ProductionOrder::create($data + [
                'number' => $number,
                'status' => 'PLANNED',
                'unit' => $part->unit,
                'created_by' => $request->user()->id,
            ]);
            foreach ($routes as $route) {
                $instruction = DB::table('work_instructions')->where('operation_id', $route->operation_id)->where('active', true)->orderByDesc('version')->first();
                DB::table('production_order_operations')->insert([
                    'production_order_id' => $order->id,
                    'operation_id' => $route->operation_id,
                    'work_instruction_id' => $instruction?->id,
                    'sequence' => $route->sequence,
                    'status' => 'PENDING',
                    'planned_quantity' => $data['planned_quantity'],
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            $components = DB::table('bom_lines')->where('active', true)->get()->groupBy('component_part_id');
            foreach ($components as $partId => $lines) {
                $required = $lines->sum(fn ($line): float => (float) $line->quantity_per_unit * (float) $data['planned_quantity']);
                $component = DB::table('parts')->where('id', $partId)->first();
                $firstLine = $lines->first();
                if ($component === null || $firstLine === null) {
                    abort(422, 'La BOM contiene un componente inválido.');
                }
                DB::table('production_order_materials')->insert([
                    'production_order_id' => $order->id, 'part_id' => $partId,
                    'required_quantity' => $required, 'unit' => $component->unit ?? $firstLine->unit,
                    'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            $this->audit->record($request, 'ORDER_CREATED', $order, 'Alta de orden de producción', null, $order->toArray());

            return $order;
        });

        return $this->success("Orden {$order->number} creada con ruta e insumos planificados.");
    }

    public function updateOrderStatus(Request $request, ProductionOrder $order): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);
        $allowed = [
            'PLANNED' => ['RELEASED', 'CANCELLED'],
            'RELEASED' => ['IN_PROGRESS', 'CANCELLED'],
            'IN_PROGRESS' => ['COMPLETED', 'CANCELLED'],
        ];
        abort_unless(in_array($data['status'], $allowed[$order->status] ?? [], true), 422, 'Transición de estado no permitida.');
        abort_if($data['status'] === 'COMPLETED' && $order->operations()->where('status', '!=', 'COMPLETED')->exists(), 422, 'Complete todas las operaciones antes de cerrar la orden.');

        $before = $order->toArray();
        $changes = ['status' => $data['status']];
        if ($data['status'] === 'RELEASED') {
            $changes['released_by'] = $request->user()->id;
            $order->operations()->orderBy('sequence')->first()?->update(['status' => 'READY']);
        } elseif ($data['status'] === 'IN_PROGRESS') {
            $changes['started_at'] = now();
        } elseif ($data['status'] === 'COMPLETED') {
            $changes['completed_at'] = now();
        }
        $order->update($changes);
        $this->audit->record($request, 'ORDER_STATUS_CHANGED', $order, $data['reason'], $before, $order->fresh()->toArray());

        return $this->success("Orden {$order->number}: {$data['status']}.");
    }

    public function split(Request $request, Container $container): RedirectResponse
    {
        $data = $request->validate([
            'pieces' => ['required', 'integer', 'min:2', 'max:20'],
            'quantity_each' => ['required', 'numeric', 'gt:0'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);
        DB::transaction(function () use ($container, $data, $request): void {
            $source = Container::lockForUpdate()->findOrFail($container->id);
            $total = (float) $data['pieces'] * (float) $data['quantity_each'];
            abort_if(! $source->active || $source->quarantined || $total > $source->quantity_current, 422, 'El contenedor no está disponible o no tiene saldo suficiente.');
            $group = (string) Str::uuid();
            $source->decrement('quantity_current', $total);
            if ($source->fresh()->quantity_current <= 0) {
                $source->update(['active' => false, 'status' => 'CONSUMED']);
            }
            for ($i = 1; $i <= $data['pieces']; $i++) {
                $child = Container::create([
                    'serial' => $this->nextSerial((string) $source->part->serial_prefix),
                    'part_id' => $source->part_id, 'location_id' => $source->location_id,
                    'status' => $source->status === 'CONSUMED' ? 'OK' : $source->status,
                    'origin' => 'SPLIT', 'lot_code' => $source->lot_code, 'life_stage' => $source->life_stage,
                    'parent_colony' => $source->parent_colony, 'supplier_lot' => $source->supplier_lot,
                    'production_lot' => $source->production_lot, 'quantity_current' => $data['quantity_each'],
                    'unit' => $source->unit, 'active' => true,
                ]);
                $this->genealogy($group, $source->id, $child->id, 'SPLIT', (float) $data['quantity_each'], $source->unit, $request, $data['reason']);
            }
            $this->audit->record($request, 'CONTAINER_SPLIT', $source, $data['reason'], ['quantity' => $source->quantity_current + $total], ['quantity' => $source->fresh()->quantity_current, 'children' => $data['pieces']]);
        });

        return $this->success('División registrada con genealogía completa.');
    }

    public function merge(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'container_ids' => ['required', 'array', 'min:2', 'max:20'],
            'container_ids.*' => ['integer', 'distinct', 'exists:containers,id'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);
        DB::transaction(function () use ($data, $request): void {
            $sources = Container::with('part')->whereIn('id', $data['container_ids'])->lockForUpdate()->get();
            abort_if($sources->count() !== count($data['container_ids']) || $sources->contains(fn ($x) => ! $x->active || $x->quarantined), 422, 'Hay contenedores no disponibles.');
            abort_if($sources->pluck('part_id')->unique()->count() > 1 || $sources->pluck('unit')->unique()->count() > 1 || $sources->pluck('location_id')->unique()->count() > 1, 422, 'Para fusionar, parte, unidad y ubicación deben coincidir.');
            $first = $sources->first();
            $total = (float) $sources->sum('quantity_current');
            $child = Container::create([
                'serial' => $this->nextSerial((string) $first->part->serial_prefix), 'part_id' => $first->part_id,
                'location_id' => $first->location_id, 'status' => 'OK', 'origin' => 'MERGE',
                'lot_code' => 'MIX-'.now()->format('Ymd-His'), 'life_stage' => $first->life_stage,
                'production_lot' => today(), 'quantity_current' => $total, 'unit' => $first->unit, 'active' => true,
            ]);
            $group = (string) Str::uuid();
            foreach ($sources as $source) {
                $source->update(['quantity_current' => 0, 'active' => false, 'status' => 'CONSUMED']);
                $this->genealogy($group, $source->id, $child->id, 'MERGE', (float) $source->getOriginal('quantity_current'), $source->unit, $request, $data['reason']);
            }
            $this->audit->record($request, 'CONTAINERS_MERGED', $child, $data['reason'], ['sources' => $data['container_ids']], ['quantity' => $total]);
        });

        return $this->success('Fusión registrada con todos los consumos y el lote resultante.');
    }

    public function inspectQuality(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'quality_specification_id' => ['required', 'exists:quality_specifications,id'],
            'container_id' => ['nullable', 'exists:containers,id'],
            'production_order_id' => ['nullable', 'exists:production_orders,id'],
            'supplier_lot' => ['nullable', 'string', 'max:100'],
            'result_value' => ['required', 'numeric'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $spec = QualitySpecification::query()->whereKey($data['quality_specification_id'])->firstOrFail();
        $value = (float) $data['result_value'];
        $pass = ($spec->min_value === null || $value >= $spec->min_value) && ($spec->max_value === null || $value <= $spec->max_value);
        $disposition = $pass ? 'RELEASE' : 'HOLD';
        $number = 'QI-'.now()->format('Ymd').'-'.str_pad((string) (DB::table('quality_inspections')->count() + 1), 4, '0', STR_PAD_LEFT);
        $id = DB::table('quality_inspections')->insertGetId($data + [
            'number' => $number, 'status' => $pass ? 'PASS' : 'FAIL', 'disposition' => $disposition,
            'inspected_by' => $request->user()->id, 'disposed_by' => $pass ? $request->user()->id : null,
            'occurred_at' => now(), 'disposed_at' => $pass ? now() : null, 'created_at' => now(), 'updated_at' => now(),
        ]);
        if (! empty($data['container_id'])) {
            Container::query()->whereKey($data['container_id'])->firstOrFail()->update(['quarantined' => ! $pass, 'status' => $pass ? 'RELEASED' : 'HOLD']);
        }
        $this->audit->record($request, 'QUALITY_INSPECTION_RECORDED', 'quality_inspections', 'Inspección contra especificación '.$spec->code, null, compact('number', 'value', 'pass', 'disposition'), $id);

        return $this->success("Inspección {$number}: ".($pass ? 'liberada' : 'en cuarentena').'.');
    }

    public function disposeQuality(Request $request, int $inspection): RedirectResponse
    {
        abort_unless(in_array($request->user()->role, ['admin', 'supervisor'], true), 403);
        $data = $request->validate(['disposition' => ['required', Rule::in(['RELEASE', 'REJECT'])], 'reason' => ['required', 'string', 'min:5', 'max:500']]);
        $row = DB::table('quality_inspections')->where('id', $inspection)->first();
        if ($row === null) {
            abort(404);
        }
        DB::table('quality_inspections')->where('id', $inspection)->update(['disposition' => $data['disposition'], 'disposed_by' => $request->user()->id, 'disposed_at' => now(), 'notes' => trim(($row->notes ?? '')."\n".$data['reason']), 'updated_at' => now()]);
        if ($row->container_id) {
            Container::query()->whereKey($row->container_id)->first()?->update(['quarantined' => false, 'status' => $data['disposition'] === 'RELEASE' ? 'RELEASED' : 'REJECTED', 'active' => $data['disposition'] === 'RELEASE']);
        }
        $this->audit->record($request, 'QUALITY_DISPOSITION', 'quality_inspections', $data['reason'], ['disposition' => $row->disposition], ['disposition' => $data['disposition']], $inspection);

        return $this->success('Disposición de calidad registrada.');
    }

    public function recordEnvironment(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'environmental_limit_id' => ['required', 'exists:environmental_limits,id'], 'location_id' => ['required', 'exists:locations,id'],
            'container_id' => ['nullable', 'exists:containers,id'], 'production_order_id' => ['nullable', 'exists:production_orders,id'],
            'value' => ['required', 'numeric'], 'source' => ['required', Rule::in(['MANUAL', 'SENSOR'])], 'evidence' => ['nullable', 'string', 'max:1000'],
        ]);
        $limit = EnvironmentalLimit::query()->whereKey($data['environmental_limit_id'])->firstOrFail();
        $value = (float) $data['value'];
        $within = ($limit->min_value === null || $value >= $limit->min_value) && ($limit->max_value === null || $value <= $limit->max_value);
        $id = DB::table('environmental_readings')->insertGetId($data + [
            'within_limits' => $within, 'alarm_status' => $within ? 'NORMAL' : 'OPEN', 'recorded_by' => $request->user()->id,
            'recorded_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->audit->record($request, 'ENVIRONMENT_READING_RECORDED', 'environmental_readings', 'Captura ambiental '.($within ? 'dentro' : 'fuera').' de límite', null, compact('value', 'within'), $id);

        return $this->success($within ? 'Lectura dentro de especificación.' : 'Alarma ambiental abierta.');
    }

    public function acknowledgeEnvironment(Request $request, int $reading): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:5', 'max:500']]);
        $row = DB::table('environmental_readings')->where('id', $reading)->first();
        if ($row === null) {
            abort(404);
        }
        DB::table('environmental_readings')->where('id', $reading)->update(['alarm_status' => 'ACKNOWLEDGED', 'acknowledged_by' => $request->user()->id, 'acknowledged_at' => now(), 'evidence' => trim(($row->evidence ?? '')."\nAcción: ".$data['reason']), 'updated_at' => now()]);
        $this->audit->record($request, 'ENVIRONMENT_ALARM_ACKNOWLEDGED', 'environmental_readings', $data['reason'], ['alarm_status' => $row->alarm_status], ['alarm_status' => 'ACKNOWLEDGED'], $reading);

        return $this->success('Alarma reconocida con evidencia.');
    }

    public function reportBiosecurity(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['CLEANING', 'PEST', 'VISITOR', 'MORTALITY', 'SANITARY', 'BARRIER'])],
            'location_id' => ['nullable', 'exists:locations,id'], 'severity' => ['required', Rule::in(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])],
            'observation' => ['required', 'string', 'min:5', 'max:2000'], 'immediate_action' => ['nullable', 'string', 'max:2000'],
        ]);
        $number = 'BIO-'.now()->format('Ymd').'-'.str_pad((string) (DB::table('biosecurity_events')->count() + 1), 4, '0', STR_PAD_LEFT);
        $id = DB::table('biosecurity_events')->insertGetId($data + ['number' => $number, 'status' => 'OPEN', 'reported_by' => $request->user()->id, 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        $this->audit->record($request, 'BIOSECURITY_EVENT_REPORTED', 'biosecurity_events', 'Registro de evento '.$data['type'], null, ['number' => $number, 'severity' => $data['severity']], $id);

        return $this->success("Evento {$number} abierto.");
    }

    public function closeBiosecurity(Request $request, int $event): RedirectResponse
    {
        $data = $request->validate(['corrective_action' => ['required', 'string', 'min:10', 'max:2000']]);
        $row = DB::table('biosecurity_events')->where('id', $event)->first();
        if ($row === null) {
            abort(404);
        }
        DB::table('biosecurity_events')->where('id', $event)->update(['status' => 'CLOSED', 'corrective_action' => $data['corrective_action'], 'closed_by' => $request->user()->id, 'closed_at' => now(), 'updated_at' => now()]);
        $this->audit->record($request, 'BIOSECURITY_EVENT_CLOSED', 'biosecurity_events', $data['corrective_action'], ['status' => $row->status], ['status' => 'CLOSED'], $event);

        return $this->success('Evento de bioseguridad cerrado.');
    }

    public function closeMassBalance(Request $request, ProductionOrder $order): RedirectResponse
    {
        $data = $request->validate([
            'substrate_input' => ['required', 'numeric', 'gte:0'], 'water_input' => ['required', 'numeric', 'gte:0'], 'biomass_input' => ['required', 'numeric', 'gte:0'],
            'larvae_output' => ['required', 'numeric', 'gte:0'], 'frass_output' => ['required', 'numeric', 'gte:0'], 'coproduct_output' => ['required', 'numeric', 'gte:0'],
            'evaporation' => ['required', 'numeric', 'gte:0'], 'waste' => ['required', 'numeric', 'gte:0'], 'tolerance_percent' => ['required', 'numeric', 'between:0,25'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $input = (float) $data['substrate_input'] + (float) $data['water_input'] + (float) $data['biomass_input'];
        $output = (float) $data['larvae_output'] + (float) $data['frass_output'] + (float) $data['coproduct_output'] + (float) $data['evaporation'] + (float) $data['waste'];
        $variance = $input - $output;
        $variancePercent = $input > 0 ? abs($variance) / $input * 100 : 0;
        $status = $variancePercent <= (float) $data['tolerance_percent'] ? 'BALANCED' : 'OUT_OF_TOLERANCE';
        $payload = $data + ['variance' => $variance, 'variance_percent' => $variancePercent, 'status' => $status, 'closed_by' => $request->user()->id, 'closed_at' => now(), 'updated_at' => now()];
        $id = DB::table('mass_balances')->updateOrInsert(['production_order_id' => $order->id], $payload + ['created_at' => now()]);
        $this->audit->record($request, 'MASS_BALANCE_CLOSED', 'mass_balances', 'Cierre del balance de masa', null, ['status' => $status, 'variance_percent' => $variancePercent], $order->id);

        return $this->success("Balance {$status}; desviación ".number_format($variancePercent, 2).'%.');
    }

    public function runBackup(Request $request): RedirectResponse
    {
        abort_unless($request->user()->role === 'admin', 403);
        $exit = Artisan::call('mes:backup');
        $this->audit->record($request, 'BACKUP_EXECUTED', 'backup_runs', 'Respaldo manual solicitado desde la aplicación', null, ['exit_code' => $exit]);

        return $exit === 0 ? $this->success('Respaldo creado y verificado correctamente.') : back()->withErrors(['backup' => Artisan::output()]);
    }

    private function genealogy(string $group, int $parent, int $child, string $action, float $quantity, string $unit, Request $request, string $reason): void
    {
        DB::table('genealogy_events')->insert([
            'event_group' => $group, 'parent_container_id' => $parent, 'child_container_id' => $child,
            'action' => $action, 'quantity' => $quantity, 'unit' => $unit, 'user_id' => $request->user()->id,
            'reason' => $reason, 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function nextSerial(string $prefix): string
    {
        $number = (int) Container::where('serial', 'like', "{$prefix}%")
            ->selectRaw('MAX(CAST(SUBSTR(serial, ?) AS INTEGER)) as number', [strlen($prefix) + 1])->value('number');

        return $prefix.str_pad((string) ($number + 1), 6, '0', STR_PAD_LEFT);
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
