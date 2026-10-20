<?php

namespace App\Http\Controllers;

use App\Models\Container;
use App\Models\Location;
use App\Models\NurseryBatch;
use App\Models\Operation;
use App\Models\Parameter;
use App\Models\Part;
use App\Models\ProductionOrder;
use App\Models\ProductionOrderOperation;
use App\Models\WorkCenter;
use App\Services\AuditService;
use App\Services\MesDataService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MesController extends Controller
{
    public function __construct(private readonly MesDataService $data, private readonly AuditService $audit) {}

    public function dashboard(): Response
    {
        return Inertia::render('dashboard', $this->data->dashboard());
    }

    public function section(string $section): Response
    {
        abort_unless(in_array($section, ['parts', 'locations', 'operations', 'routing', 'bom', 'orders', 'control', 'nursery', 'feeding', 'inventory', 'trace', 'quality', 'environment', 'biosecurity', 'mass-balance', 'maintenance', 'audit', 'continuity', 'governance', 'parameters', 'costs', 'users'], true), 404);
        abort_if($section === 'users' && request()->user()->role !== 'admin', 403);
        abort_if(in_array($section, ['audit', 'continuity'], true) && ! in_array(request()->user()->role, ['admin', 'supervisor'], true), 403);

        return Inertia::render('mes/section', ['section' => $section, 'data' => $this->data->section($section)]);
    }

    public function receive(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'part_id' => ['required', 'exists:parts,id'], 'location_id' => ['required', 'exists:locations,id'],
            'quantity' => ['required', 'numeric', 'gt:0'], 'containers' => ['required', 'integer', 'min:1', 'max:100'],
            'supplier_lot' => ['required', 'string', 'max:100'],
        ]);

        DB::transaction(function () use ($validated, $request): void {
            $part = Part::findOrFail((int) $validated['part_id']);
            for ($index = 0; $index < $validated['containers']; $index++) {
                $container = Container::create([
                    'serial' => $this->nextSerial($part->serial_prefix), 'part_id' => $part->id,
                    'location_id' => $validated['location_id'], 'status' => 'OK', 'origin' => 'RECEIPT',
                    'supplier_lot' => $validated['supplier_lot'], 'quantity_current' => $validated['quantity'],
                    'unit' => $part->unit, 'active' => true,
                ]);
                DB::table('inventory_movements')->insert([
                    'container_id' => $container->id, 'type' => 'RECEIPT', 'quantity' => $validated['quantity'],
                    'unit' => $part->unit, 'to_location_id' => $validated['location_id'], 'reference' => $validated['supplier_lot'],
                    'user_id' => $request->user()->id, 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now(),
                ]);
            }
            $this->audit->record($request, 'MATERIAL_RECEIVED', 'inventory_receipts', 'Recepción de lote proveedor '.$validated['supplier_lot'], null, $validated);
        });

        return $this->success('Recibo generado y contenedores creados.');
    }

    public function produce(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'operation_id' => ['required', 'exists:operations,id'], 'input_container_id' => ['nullable', 'exists:containers,id'],
            'quantity_in' => ['nullable', 'numeric', 'gt:0'], 'quantity_out' => ['required', 'numeric', 'gt:0'],
            'production_order_id' => ['nullable', 'exists:production_orders,id'],
            'production_order_operation_id' => ['nullable', 'exists:production_order_operations,id'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($validated, $request): void {
            $operation = Operation::with(['outputPart', 'workCenter'])->findOrFail((int) $validated['operation_id']);
            $order = isset($validated['production_order_id']) ? ProductionOrder::lockForUpdate()->findOrFail((int) $validated['production_order_id']) : null;
            $orderOperation = isset($validated['production_order_operation_id']) ? ProductionOrderOperation::lockForUpdate()->findOrFail((int) $validated['production_order_operation_id']) : null;
            abort_if($order && ! in_array($order->status, ['RELEASED', 'IN_PROGRESS'], true), 422, 'La orden debe estar liberada o en proceso.');
            abort_if($orderOperation && ($orderOperation->production_order_id !== $order?->id || $orderOperation->operation_id !== $operation->id), 422, 'La operación seleccionada no pertenece a la orden.');
            $input = isset($validated['input_container_id']) ? Container::lockForUpdate()->findOrFail((int) $validated['input_container_id']) : null;
            $quantityIn = (float) ($validated['quantity_in'] ?? 0);
            abort_if($operation->input_part_id && ! $input, 422, 'La operación requiere un contenedor de entrada.');
            abort_if($input && ($input->part_id !== $operation->input_part_id || ! $input->active || $input->quarantined || in_array($input->status, ['HOLD', 'REJECTED'], true) || $quantityIn > $input->quantity_current), 422, 'El contenedor de entrada no es compatible, está en cuarentena o no tiene saldo suficiente.');
            if ($input) {
                $input->quantity_current -= $quantityIn;
                if ($input->quantity_current <= 0) {
                    $input->forceFill(['quantity_current' => 0, 'active' => false, 'status' => 'CONSUMED']);
                }
                $input->save();
            }
            $output = Container::create([
                'serial' => $this->nextSerial($operation->outputPart->serial_prefix), 'part_id' => $operation->output_part_id,
                'location_id' => Location::where('code', $operation->workCenter?->code)->value('id'), 'status' => 'OK',
                'origin' => 'PRODUCTION', 'production_lot' => today(), 'quantity_current' => $validated['quantity_out'],
                'unit' => $operation->outputPart->unit, 'active' => true,
            ]);
            $runId = DB::table('production_runs')->insertGetId([
                'production_order_id' => $order?->id, 'production_order_operation_id' => $orderOperation?->id,
                'operation_id' => $operation->id, 'input_container_id' => $input?->id, 'output_container_id' => $output->id,
                'quantity_in' => $input ? $quantityIn : null, 'quantity_out' => $validated['quantity_out'], 'unit' => $operation->outputPart->unit,
                'fields' => json_encode(['notes' => $validated['notes'] ?? null]), 'user_id' => $request->user()->id,
                'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('genealogy_events')->insert([
                'event_group' => (string) Str::uuid(), 'parent_container_id' => $input?->id, 'child_container_id' => $output->id, 'operation_id' => $operation->id,
                'production_order_id' => $order?->id, 'user_id' => $request->user()->id, 'reason' => $validated['notes'] ?? 'Ejecución estándar',
                'action' => 'PRODUCTION', 'quantity' => $validated['quantity_out'], 'unit' => $operation->outputPart->unit,
                'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now(),
            ]);
            DB::table('inventory_movements')->insert([
                'container_id' => $output->id, 'type' => 'PRODUCTION', 'quantity' => $validated['quantity_out'],
                'unit' => $operation->outputPart->unit, 'to_location_id' => $output->location_id, 'reference' => "RUN-{$runId}",
                'user_id' => $request->user()->id, 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now(),
            ]);
            if ($orderOperation) {
                $executionOrder = ProductionOrder::query()->whereKey($orderOperation->production_order_id)->firstOrFail();
                $orderOperation->update([
                    'status' => 'COMPLETED', 'actual_input' => $quantityIn, 'actual_output' => $validated['quantity_out'],
                    'operator_id' => $request->user()->id, 'started_at' => $orderOperation->started_at ?? now(), 'completed_at' => now(),
                ]);
                $executionOrder->update(['status' => 'IN_PROGRESS', 'started_at' => $executionOrder->started_at ?? now()]);
                $executionOrder->operations()->where('sequence', '>', $orderOperation->sequence)->orderBy('sequence')->first()?->update(['status' => 'READY']);
                if (! $executionOrder->operations()->where('status', '!=', 'COMPLETED')->exists()) {
                    $executionOrder->update(['completed_quantity' => $validated['quantity_out']]);
                }
            }
            $this->audit->record($request, 'PRODUCTION_RECORDED', $output, $validated['notes'] ?? 'Ejecución estándar', null, ['run_id' => $runId, 'order' => $order?->number]);
        });

        return $this->success('Producción registrada con genealogía e inventario.');
    }

    public function moveContainer(Request $request, Container $container): RedirectResponse
    {
        $validated = $request->validate(['location_id' => ['required', 'exists:locations,id']]);
        $from = $container->location_id;
        $before = $container->toArray();
        $container->update(['location_id' => $validated['location_id']]);
        DB::table('inventory_movements')->insert([
            'container_id' => $container->id, 'type' => 'MOVE', 'quantity' => $container->quantity_current,
            'unit' => $container->unit, 'from_location_id' => $from, 'to_location_id' => $validated['location_id'],
            'user_id' => $request->user()->id, 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->audit->record($request, 'CONTAINER_MOVED', $container, 'Movimiento operativo de ubicación', $before, $container->fresh()->toArray());

        return $this->success('Contenedor movido.');
    }

    public function advanceNursery(Request $request, NurseryBatch $batch): RedirectResponse
    {
        abort_if($batch->closed_at || $batch->level >= 5, 422, 'El lote ya no puede avanzar.');
        DB::transaction(function () use ($batch, $request): void {
            $before = $batch->toArray();
            $batch->increment('level');
            $batch->forceFill(['level_at' => now(), 'status' => $batch->level === 5 ? 'READY' : 'INCUBATING'])->save();
            $batch->container()->update([
                'location_id' => Location::where('code', "{$batch->rack}-N{$batch->level}")->value('id'),
                'status' => $batch->level === 5 ? 'READY' : 'INCUBATING',
                'part_id' => $batch->level === 5 ? Part::where('code', 'BSF004')->value('id') : $batch->container->part_id,
            ]);
            DB::table('nursery_events')->insert([
                'nursery_batch_id' => $batch->id, 'action' => "Movimiento a N{$batch->level}",
                'user_id' => $request->user()->id, 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now(),
            ]);
            $this->audit->record($request, 'NURSERY_ADVANCED', $batch, "Avance controlado a nivel N{$batch->level}", $before, $batch->fresh()->toArray());
        });

        return $this->success("Lote movido a N{$batch->level}.");
    }

    public function updateParameter(Request $request, Parameter $parameter): RedirectResponse
    {
        abort_unless(in_array($request->user()->role, ['admin', 'supervisor'], true), 403);
        abort_unless($parameter->editable, 403);
        $before = $parameter->toArray();
        $parameter->update($request->validate(['value' => ['required', 'numeric', 'gte:0']]));
        $this->audit->record($request, 'PARAMETER_CHANGED', $parameter, 'Actualización desde panel de parámetros', $before, $parameter->fresh()->toArray());

        return $this->success('Parámetro actualizado.');
    }

    public function updateWorkCenter(Request $request, WorkCenter $workCenter): RedirectResponse
    {
        $validated = $request->validate(['status' => ['required', Rule::in(['PRODUCTION', 'CHANGEOVER', 'PLANNED', 'UNPLANNED', 'OFF', 'IDLE'])], 'notes' => ['nullable', 'string', 'max:500']]);
        $previous = $workCenter->status;
        $workCenter->update(['status' => $validated['status']]);
        DB::table('work_center_logs')->insert([
            'work_center_id' => $workCenter->id, 'status' => $validated['status'], 'previous_status' => $previous,
            'notes' => $validated['notes'] ?? null, 'user_id' => $request->user()->id,
            'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
        $this->audit->record($request, 'WORK_CENTER_STATUS_CHANGED', $workCenter, $validated['notes'] ?? 'Cambio de estado operativo', ['status' => $previous], ['status' => $validated['status']]);

        return $this->success('Estado del workcenter actualizado.');
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }

    private function nextSerial(string $prefix): string
    {
        $number = (int) Container::where('serial', 'like', "{$prefix}%")
            ->selectRaw('MAX(CAST(SUBSTR(serial, ?) AS INTEGER)) as number', [strlen($prefix) + 1])->value('number');

        return $prefix.str_pad((string) ($number + 1), 6, '0', STR_PAD_LEFT);
    }
}
