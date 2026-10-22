<?php

namespace App\Http\Controllers;

use App\Models\Container;
use App\Models\ProductionOrderOperation;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MesShopFloorController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function start(Request $request, ProductionOrderOperation $orderOperation): RedirectResponse
    {
        $orderOperation->load(['productionOrder', 'operation']);
        if ($orderOperation->status !== 'READY') {
            throw ValidationException::withMessages(['operation' => 'La operación debe estar lista antes de iniciar.']);
        }
        if (! in_array($orderOperation->productionOrder->status, ['RELEASED', 'IN_PROGRESS'], true)) {
            throw ValidationException::withMessages(['operation' => 'La orden no está liberada para piso.']);
        }

        $workCenterId = $orderOperation->operation->work_center_id;
        $this->assertWorkCenterAvailable($workCenterId);
        if (DB::table('production_execution_sessions')->where('production_order_operation_id', $orderOperation->id)->whereIn('status', ['RUNNING', 'PAUSED'])->exists()) {
            throw ValidationException::withMessages(['operation' => 'La operación ya tiene una sesión activa.']);
        }
        if (DB::table('production_execution_sessions')->where('work_center_id', $workCenterId)->where('status', 'RUNNING')->exists()) {
            throw ValidationException::withMessages(['operation' => 'El centro de trabajo ya está ejecutando otra operación.']);
        }

        DB::transaction(function () use ($request, $orderOperation, $workCenterId): void {
            $instruction = $orderOperation->work_instruction_id
                ? DB::table('work_instructions')->where('id', $orderOperation->work_instruction_id)->first()
                : null;
            $steps = $instruction ? json_decode((string) $instruction->steps, true) : [];
            foreach (is_array($steps) ? $steps : [] as $index => $description) {
                DB::table('production_checklist_items')->insertOrIgnore([
                    'production_order_operation_id' => $orderOperation->id,
                    'work_instruction_id' => $instruction->id,
                    'step_index' => $index + 1,
                    'description' => (string) $description,
                    'completed' => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $sessionId = DB::table('production_execution_sessions')->insertGetId([
                'production_order_operation_id' => $orderOperation->id,
                'work_center_id' => $workCenterId,
                'operator_id' => $request->user()->id,
                'status' => 'RUNNING',
                'started_at' => now(),
                'last_resumed_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $orderOperation->update(['status' => 'IN_PROGRESS', 'started_at' => $orderOperation->started_at ?? now(), 'operator_id' => $request->user()->id]);
            $orderOperation->productionOrder->update(['status' => 'IN_PROGRESS', 'started_at' => $orderOperation->productionOrder->started_at ?? now()]);
            $this->audit->record($request, 'SHOP_FLOOR_OPERATION_STARTED', 'production_execution_sessions', 'Operación iniciada desde el panel de control', null, ['order_operation_id' => $orderOperation->id], $sessionId);
        });

        return $this->success('Operación iniciada. Complete la instrucción antes de registrar producción.');
    }

    public function checklist(Request $request, ProductionOrderOperation $orderOperation, int $item): RedirectResponse
    {
        $data = $request->validate(['completed' => ['required', 'boolean']]);
        $row = DB::table('production_checklist_items')->where('id', $item)->where('production_order_operation_id', $orderOperation->id)->first();
        if (! $row) {
            throw ValidationException::withMessages(['checklist' => 'El paso no pertenece a esta operación.']);
        }
        $session = DB::table('production_execution_sessions')->where('production_order_operation_id', $orderOperation->id)->whereIn('status', ['RUNNING', 'PAUSED'])->latest('id')->first();
        if (! $session) {
            throw ValidationException::withMessages(['checklist' => 'Inicie la operación antes de completar la instrucción.']);
        }
        $this->authorizeSession($request, (int) $session->operator_id);

        DB::table('production_checklist_items')->where('id', $item)->update([
            'completed' => $data['completed'],
            'completed_by' => $data['completed'] ? $request->user()->id : null,
            'completed_at' => $data['completed'] ? now() : null,
            'updated_at' => now(),
        ]);
        $this->audit->record($request, 'SHOP_FLOOR_CHECKLIST_UPDATED', 'production_checklist_items', $data['completed'] ? 'Paso confirmado' : 'Confirmación retirada', ['completed' => (bool) $row->completed], ['completed' => $data['completed']], $item);

        return $this->success($data['completed'] ? 'Paso confirmado.' : 'Confirmación retirada.');
    }

    public function pause(Request $request, int $session): RedirectResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'max:500']]);
        $row = DB::table('production_execution_sessions')->where('id', $session)->where('status', 'RUNNING')->first();
        if (! $row) {
            throw ValidationException::withMessages(['session' => 'La sesión no está en ejecución.']);
        }
        $this->authorizeSession($request, (int) $row->operator_id);
        $activeMinutes = (int) $row->active_minutes + Carbon::parse($row->last_resumed_at ?? $row->started_at)->diffInMinutes(now());
        DB::table('production_execution_sessions')->where('id', $session)->update([
            'status' => 'PAUSED',
            'active_minutes' => $activeMinutes,
            'paused_at' => now(),
            'pause_reason' => $data['reason'],
            'updated_at' => now(),
        ]);
        $this->audit->record($request, 'SHOP_FLOOR_OPERATION_PAUSED', 'production_execution_sessions', $data['reason'], ['status' => 'RUNNING'], ['status' => 'PAUSED', 'active_minutes' => $activeMinutes], $session);

        return $this->success('Operación pausada y tiempo activo conservado.');
    }

    public function resume(Request $request, int $session): RedirectResponse
    {
        $row = DB::table('production_execution_sessions')->where('id', $session)->where('status', 'PAUSED')->first();
        if (! $row) {
            throw ValidationException::withMessages(['session' => 'La sesión no está pausada.']);
        }
        $this->authorizeSession($request, (int) $row->operator_id);
        $this->assertWorkCenterAvailable((int) $row->work_center_id);
        if (DB::table('production_execution_sessions')->where('work_center_id', $row->work_center_id)->where('status', 'RUNNING')->where('id', '!=', $session)->exists()) {
            throw ValidationException::withMessages(['session' => 'El centro de trabajo está ocupado por otra operación.']);
        }
        DB::table('production_execution_sessions')->where('id', $session)->update([
            'status' => 'RUNNING',
            'last_resumed_at' => now(),
            'paused_at' => null,
            'pause_reason' => null,
            'updated_at' => now(),
        ]);
        $this->audit->record($request, 'SHOP_FLOOR_OPERATION_RESUMED', 'production_execution_sessions', 'Operación reanudada desde el panel', ['status' => 'PAUSED'], ['status' => 'RUNNING'], $session);

        return $this->success('Operación reanudada.');
    }

    public function scrap(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'production_execution_session_id' => ['required', 'exists:production_execution_sessions,id'],
            'scrap_reason_code_id' => ['required', 'exists:scrap_reason_codes,id'],
            'container_id' => ['nullable', 'exists:containers,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'unit' => ['required', 'string', 'max:20'],
            'notes' => ['required', 'string', 'max:1000'],
        ]);
        $session = DB::table('production_execution_sessions')->where('id', $data['production_execution_session_id'])->where('status', 'RUNNING')->first();
        if (! $session) {
            throw ValidationException::withMessages(['production_execution_session_id' => 'El desperdicio sólo puede registrarse durante una operación activa.']);
        }
        $this->authorizeSession($request, (int) $session->operator_id);

        DB::transaction(function () use ($request, $data, $session): void {
            $container = ! empty($data['container_id']) ? Container::query()->lockForUpdate()->findOrFail((int) $data['container_id']) : null;
            if ($container && (float) $data['quantity'] > (float) $container->quantity_current) {
                throw ValidationException::withMessages(['quantity' => 'La cantidad de desperdicio supera el saldo del contenedor.']);
            }
            if ($container) {
                $container->quantity_current -= (float) $data['quantity'];
                if ($container->quantity_current <= 0) {
                    $container->forceFill(['quantity_current' => 0, 'active' => false, 'status' => 'SCRAPPED']);
                }
                $container->save();
            }
            $eventId = DB::table('production_scrap_events')->insertGetId([
                'production_execution_session_id' => $session->id,
                'production_order_operation_id' => $session->production_order_operation_id,
                'container_id' => $container?->id,
                'scrap_reason_code_id' => $data['scrap_reason_code_id'],
                'quantity' => $data['quantity'],
                'unit' => $data['unit'],
                'notes' => $data['notes'],
                'reported_by' => $request->user()->id,
                'reported_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('production_order_operations')->where('id', $session->production_order_operation_id)->increment('actual_scrap', (float) $data['quantity'], ['updated_at' => now()]);
            if ($container) {
                DB::table('inventory_movements')->insert([
                    'container_id' => $container->id,
                    'type' => 'SCRAP',
                    'quantity' => -1 * (float) $data['quantity'],
                    'unit' => $data['unit'],
                    'from_location_id' => $container->location_id,
                    'reference' => "SCRAP-{$eventId}",
                    'user_id' => $request->user()->id,
                    'occurred_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->audit->record($request, 'SHOP_FLOOR_SCRAP_RECORDED', 'production_scrap_events', $data['notes'], null, ['quantity' => $data['quantity'], 'unit' => $data['unit'], 'container' => $container?->serial], $eventId);
        });

        return $this->success('Desperdicio registrado con causa y trazabilidad.');
    }

    private function assertWorkCenterAvailable(int $workCenterId): void
    {
        $blocked = DB::table('assets')->where('work_center_id', $workCenterId)->where('active', true)->where(function ($query): void {
            $query->whereIn('status', ['BLOCKED', 'MAINTENANCE'])
                ->orWhere(fn ($subQuery) => $subQuery->whereNotNull('calibration_due_at')->whereDate('calibration_due_at', '<', today()));
        })->first();
        if ($blocked) {
            throw ValidationException::withMessages(['operation' => "El activo {$blocked->code} bloquea el inicio por estado o calibración vencida."]);
        }
    }

    private function authorizeSession(Request $request, int $operatorId): void
    {
        abort_unless($operatorId === (int) $request->user()->id || $request->user()->hasPermission('production.approve'), 403);
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
