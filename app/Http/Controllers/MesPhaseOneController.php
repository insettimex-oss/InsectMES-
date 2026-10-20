<?php

namespace App\Http\Controllers;

use App\Models\Container;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MesPhaseOneController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function recordFeeding(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'production_order_id' => ['nullable', 'exists:production_orders,id'],
            'target_container_id' => ['required', 'different:substrate_container_id', 'exists:containers,id'],
            'substrate_container_id' => ['required', 'exists:containers,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'dry_matter_percent' => ['nullable', 'numeric', 'between:0,100'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $id = DB::transaction(function () use ($data, $request): int {
            $target = Container::query()->lockForUpdate()->findOrFail((int) $data['target_container_id']);
            $substrate = Container::query()->lockForUpdate()->findOrFail((int) $data['substrate_container_id']);
            $quantity = (float) $data['quantity'];
            abort_if(! $target->active || $target->quarantined, 422, 'El contenedor destino no está disponible para alimentación.');
            abort_if(! $substrate->active || $substrate->quarantined || $quantity > (float) $substrate->quantity_current, 422, 'El sustrato está bloqueado o no tiene saldo suficiente.');

            $substrate->quantity_current -= $quantity;
            if ($substrate->quantity_current <= 0) {
                $substrate->forceFill(['quantity_current' => 0, 'active' => false, 'status' => 'CONSUMED']);
            }
            $substrate->save();

            $id = DB::table('feeding_events')->insertGetId([
                ...$data,
                'unit' => $substrate->unit,
                'recorded_by' => $request->user()->id,
                'occurred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('inventory_movements')->insert([
                'container_id' => $substrate->id,
                'type' => 'FEEDING',
                'quantity' => -$quantity,
                'unit' => $substrate->unit,
                'from_location_id' => $substrate->location_id,
                'reference' => "FEED-{$id}",
                'notes' => "Alimentación de {$target->serial}",
                'user_id' => $request->user()->id,
                'occurred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->audit->record($request, 'FEEDING_RECORDED', 'feeding_events', $data['notes'] ?? 'Alimentación controlada', null, ['target' => $target->serial, 'substrate' => $substrate->serial, 'quantity' => $quantity], $id);

            return $id;
        });

        return $this->success("Alimentación FEED-{$id} registrada y descontada del inventario.");
    }

    public function createDeviation(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'production_order_id' => ['nullable', 'exists:production_orders,id'],
            'container_id' => ['nullable', 'exists:containers,id'],
            'source' => ['required', Rule::in(['QUALITY', 'PROCESS', 'ENVIRONMENT', 'BIOSECURITY', 'SUPPLIER', 'CUSTOMER'])],
            'severity' => ['required', Rule::in(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])],
            'title' => ['required', 'string', 'max:180'],
            'description' => ['required', 'string', 'min:5', 'max:3000'],
            'immediate_action' => ['nullable', 'string', 'max:2000'],
            'root_cause' => ['nullable', 'string', 'max:2000'],
            'corrective_action' => ['required', 'string', 'min:5', 'max:2000'],
            'preventive_action' => ['nullable', 'string', 'max:2000'],
            'due_at' => ['required', 'date'],
        ]);

        $deviation = DB::transaction(function () use ($data, $request): object {
            $number = 'DEV-'.now()->format('Y').'-'.str_pad((string) (DB::table('quality_deviations')->count() + 1), 4, '0', STR_PAD_LEFT);
            $id = DB::table('quality_deviations')->insertGetId([
                'number' => $number,
                'production_order_id' => $data['production_order_id'] ?? null,
                'container_id' => $data['container_id'] ?? null,
                'source' => $data['source'],
                'severity' => $data['severity'],
                'status' => 'CAPA_OPEN',
                'title' => $data['title'],
                'description' => $data['description'],
                'immediate_action' => $data['immediate_action'] ?? null,
                'root_cause' => $data['root_cause'] ?? null,
                'owner_id' => $request->user()->id,
                'opened_by' => $request->user()->id,
                'due_at' => $data['due_at'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            foreach ([
                'CORRECTIVE' => $data['corrective_action'],
                'PREVENTIVE' => $data['preventive_action'] ?? null,
            ] as $type => $description) {
                if ($description) {
                    DB::table('corrective_actions')->insert([
                        'quality_deviation_id' => $id,
                        'type' => $type,
                        'description' => $description,
                        'status' => 'OPEN',
                        'owner_id' => $request->user()->id,
                        'due_at' => $data['due_at'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
            if (! empty($data['container_id'])) {
                Container::query()->whereKey($data['container_id'])->update(['quarantined' => true, 'status' => 'HOLD']);
            }
            $this->audit->record($request, 'QUALITY_DEVIATION_OPENED', 'quality_deviations', $data['description'], null, ['number' => $number, 'severity' => $data['severity']], $id);

            return (object) ['id' => $id, 'number' => $number];
        });

        return $this->success("Desviación {$deviation->number} abierta con plan CAPA.");
    }

    public function closeDeviation(Request $request, int $deviation): RedirectResponse
    {
        $data = $request->validate([
            'root_cause' => ['required', 'string', 'min:5', 'max:2000'],
            'disposition' => ['required', 'string', 'min:5', 'max:2000'],
            'effectiveness_result' => ['required', 'string', 'min:5', 'max:2000'],
        ]);
        DB::transaction(function () use ($deviation, $data, $request): void {
            $row = DB::table('quality_deviations')->where('id', $deviation)->lockForUpdate()->first();
            abort_if($row === null || $row->status === 'CLOSED', 422, 'La desviación no está disponible.');
            DB::table('corrective_actions')->where('quality_deviation_id', $deviation)->update([
                'status' => 'EFFECTIVE',
                'effectiveness_result' => $data['effectiveness_result'],
                'completed_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('quality_deviations')->where('id', $deviation)->update([
                'status' => 'CLOSED',
                'root_cause' => $data['root_cause'],
                'disposition' => $data['disposition'],
                'closed_by' => $request->user()->id,
                'closed_at' => now(),
                'updated_at' => now(),
            ]);
            if ($row->container_id) {
                $hasOtherDeviation = DB::table('quality_deviations')
                    ->where('container_id', $row->container_id)
                    ->where('id', '!=', $deviation)
                    ->where('status', '!=', 'CLOSED')
                    ->exists();
                $hasInspectionHold = DB::table('quality_inspections')
                    ->where('container_id', $row->container_id)
                    ->where('disposition', 'HOLD')
                    ->exists();
                if (! $hasOtherDeviation && ! $hasInspectionHold) {
                    Container::query()->whereKey($row->container_id)->update(['quarantined' => false, 'status' => 'RELEASED']);
                }
            }
            $this->audit->record($request, 'QUALITY_DEVIATION_CLOSED', 'quality_deviations', $data['disposition'], ['status' => $row->status], ['status' => 'CLOSED', 'effectiveness' => $data['effectiveness_result']], $deviation);
        });

        return $this->success('Desviación y acciones CAPA cerradas con verificación de efectividad.');
    }

    public function createAsset(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:assets,code'],
            'name' => ['required', 'string', 'max:180'],
            'type' => ['required', Rule::in(['EQUIPMENT', 'INSTRUMENT', 'UTILITY', 'VEHICLE'])],
            'work_center_id' => ['nullable', 'exists:work_centers,id'],
            'location_id' => ['nullable', 'exists:locations,id'],
            'criticality' => ['required', Rule::in(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])],
            'manufacturer' => ['nullable', 'string', 'max:120'],
            'serial_number' => ['nullable', 'string', 'max:120'],
            'next_maintenance_at' => ['nullable', 'date'],
            'calibration_due_at' => ['nullable', 'date'],
        ]);
        $id = DB::table('assets')->insertGetId($data + ['status' => 'AVAILABLE', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->audit->record($request, 'ASSET_CREATED', 'assets', 'Alta de activo controlado', null, $data, $id);

        return $this->success('Activo agregado al plan de mantenimiento.');
    }

    public function createWorkOrder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'asset_id' => ['required', 'exists:assets,id'],
            'type' => ['required', Rule::in(['PREVENTIVE', 'CORRECTIVE', 'CALIBRATION'])],
            'priority' => ['required', Rule::in(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])],
            'description' => ['required', 'string', 'min:5', 'max:2000'],
            'scheduled_at' => ['nullable', 'date'],
        ]);
        $order = DB::transaction(function () use ($data, $request): object {
            $number = 'OT-'.now()->format('Y').'-'.str_pad((string) (DB::table('maintenance_work_orders')->count() + 1), 4, '0', STR_PAD_LEFT);
            $id = DB::table('maintenance_work_orders')->insertGetId($data + [
                'number' => $number,
                'status' => 'OPEN',
                'requested_by' => $request->user()->id,
                'assigned_to' => $request->user()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('assets')->where('id', $data['asset_id'])->update([
                'status' => $data['priority'] === 'CRITICAL' || $data['type'] === 'CORRECTIVE' ? 'BLOCKED' : 'MAINTENANCE',
                'updated_at' => now(),
            ]);
            $this->audit->record($request, 'MAINTENANCE_ORDER_OPENED', 'maintenance_work_orders', $data['description'], null, ['number' => $number, 'asset_id' => $data['asset_id']], $id);

            return (object) ['id' => $id, 'number' => $number];
        });

        return $this->success("Orden {$order->number} creada; el activo quedó controlado.");
    }

    public function completeWorkOrder(Request $request, int $workOrder): RedirectResponse
    {
        $data = $request->validate([
            'result' => ['required', 'string', 'min:5', 'max:2000'],
            'downtime_minutes' => ['required', 'integer', 'min:0', 'max:525600'],
            'next_due_at' => ['nullable', 'date'],
        ]);
        DB::transaction(function () use ($workOrder, $data, $request): void {
            $row = DB::table('maintenance_work_orders')->where('id', $workOrder)->lockForUpdate()->first();
            abort_if($row === null || $row->status === 'COMPLETED', 422, 'La orden de mantenimiento no está disponible.');
            DB::table('maintenance_work_orders')->where('id', $workOrder)->update([
                'status' => 'COMPLETED',
                'result' => $data['result'],
                'downtime_minutes' => $data['downtime_minutes'],
                'started_at' => $row->started_at ?? $row->created_at,
                'completed_at' => now(),
                'completed_by' => $request->user()->id,
                'updated_at' => now(),
            ]);
            $assetUpdate = ['status' => 'AVAILABLE', 'updated_at' => now()];
            if (! empty($data['next_due_at'])) {
                $assetUpdate[$row->type === 'CALIBRATION' ? 'calibration_due_at' : 'next_maintenance_at'] = $data['next_due_at'];
            }
            DB::table('assets')->where('id', $row->asset_id)->update($assetUpdate);
            $this->audit->record($request, 'MAINTENANCE_ORDER_COMPLETED', 'maintenance_work_orders', $data['result'], ['status' => $row->status], ['status' => 'COMPLETED', 'downtime_minutes' => $data['downtime_minutes']], $workOrder);
        });

        return $this->success('Orden completada y activo liberado.');
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
