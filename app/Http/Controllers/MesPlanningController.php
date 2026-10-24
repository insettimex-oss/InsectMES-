<?php

namespace App\Http\Controllers;

use App\Models\ProductionOrder;
use App\Services\AuditService;
use App\Services\FiniteSchedulingService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MesPlanningController extends Controller
{
    public function __construct(
        private readonly FiniteSchedulingService $scheduler,
        private readonly AuditService $audit,
    ) {}

    public function capacity(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'work_center_id' => ['required', 'exists:work_centers,id'],
            'shift_id' => ['required', 'exists:shifts,id'],
            'available_minutes' => ['required', 'integer', 'between:0,1440'],
            'active' => ['required', 'boolean'],
        ]);
        DB::table('work_center_shift_capacities')->updateOrInsert(
            ['work_center_id' => $data['work_center_id'], 'shift_id' => $data['shift_id']],
            ['available_minutes' => $data['available_minutes'], 'active' => $data['active'], 'created_at' => now(), 'updated_at' => now()],
        );
        $capacityId = (int) DB::table('work_center_shift_capacities')->where('work_center_id', $data['work_center_id'])->where('shift_id', $data['shift_id'])->value('id');
        $this->audit->record($request, 'PLANNING_CAPACITY_UPDATED', 'work_center_shift_capacities', 'Capacidad disponible por centro y turno', null, $data, $capacityId);

        return $this->success('Capacidad de turno actualizada. Ejecuta nuevamente la planeación para recalcular fechas.');
    }

    public function run(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'horizon_start' => ['required', 'date'],
            'horizon_end' => ['required', 'date', 'after:horizon_start'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $result = $this->scheduler->run(
            Carbon::parse($data['horizon_start']),
            Carbon::parse($data['horizon_end']),
            $request->user()->id,
            $data['notes'] ?? null,
        );
        $this->audit->record($request, 'FINITE_PLANNING_COMPLETED', 'planning_runs', 'Planeación finita por centro y turno', null, $result, $result['run_id']);

        return $this->success("Planeación terminada: {$result['operations']} operaciones, {$result['campaigns']} campañas, {$result['changeover_minutes']} min de cambio, {$result['late']} órdenes tardías y {$result['unscheduled']} operaciones no programadas.");
    }

    public function campaign(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:40', 'regex:/^[A-Za-z0-9_-]+$/', 'unique:production_campaigns,code'],
            'name' => ['required', 'string', 'max:120'],
            'family' => ['required', 'string', 'max:80'],
            'part_id' => ['nullable', 'exists:parts,id'],
            'priority' => ['required', 'integer', 'between:1,999'],
            'planned_start' => ['nullable', 'date'],
            'planned_end' => ['nullable', 'date', 'after_or_equal:planned_start'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $data['code'] = strtoupper($data['code']);
        $data['family'] = strtoupper($data['family']);
        $data['status'] = 'ACTIVE';
        $data['active'] = true;
        $data['created_by'] = $request->user()->id;
        $data['created_at'] = now();
        $data['updated_at'] = now();
        $campaignId = DB::table('production_campaigns')->insertGetId($data);
        $this->audit->record($request, 'PLANNING_CAMPAIGN_CREATED', 'production_campaigns', 'Alta de campaña productiva', null, $data, $campaignId);

        return $this->success('Campaña creada. Ya puede asignarse a órdenes planificadas.');
    }

    public function assignCampaign(Request $request, ProductionOrder $order): RedirectResponse
    {
        abort_unless(in_array($order->status, ['PLANNED', 'RELEASED'], true), 422, 'Solo se pueden reasignar órdenes planificadas o liberadas.');
        $data = $request->validate([
            'campaign_id' => ['nullable', 'exists:production_campaigns,id'],
            'reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);
        if ($data['campaign_id'] !== null) {
            $campaign = DB::table('production_campaigns')->where('id', $data['campaign_id'])->where('active', true)->first();
            abort_if($campaign === null, 422, 'La campaña no está activa.');
            $campaignData = get_object_vars($campaign);
            abort_if($campaignData['part_id'] !== null && (int) $campaignData['part_id'] !== (int) $order->part_id, 422, 'La campaña corresponde a otro producto.');
        }
        $before = $order->toArray();
        $order->update(['campaign_id' => $data['campaign_id']]);
        $this->audit->record($request, 'ORDER_CAMPAIGN_ASSIGNED', $order, $data['reason'], $before, $order->fresh()->toArray());

        return $this->success("Campaña de {$order->number} actualizada. Recalcula el plan para aplicar la secuencia.");
    }

    public function changeover(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'work_center_id' => ['required', 'exists:work_centers,id'],
            'from_family' => ['required', 'string', 'max:80'],
            'to_family' => ['required', 'string', 'max:80', 'different:from_family'],
            'setup_minutes' => ['required', 'integer', 'between:0,1440'],
            'cleaning_required' => ['required', 'boolean'],
            'active' => ['required', 'boolean'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $data['from_family'] = strtoupper($data['from_family']);
        $data['to_family'] = strtoupper($data['to_family']);
        DB::table('work_center_changeover_rules')->updateOrInsert(
            [
                'work_center_id' => $data['work_center_id'],
                'from_family' => $data['from_family'],
                'to_family' => $data['to_family'],
            ],
            $data + ['created_at' => now(), 'updated_at' => now()],
        );
        $ruleId = (int) DB::table('work_center_changeover_rules')
            ->where('work_center_id', $data['work_center_id'])
            ->where('from_family', $data['from_family'])
            ->where('to_family', $data['to_family'])
            ->value('id');
        $this->audit->record($request, 'CHANGEOVER_RULE_UPDATED', 'work_center_changeover_rules', 'Regla de cambio de campaña', null, $data, $ruleId);

        return $this->success('Regla de cambio actualizada. El tiempo se reservará en la siguiente corrida.');
    }

    public function biologicalRule(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'part_id' => ['required', 'exists:parts,id'],
            'operation_id' => ['required', 'exists:operations,id'],
            'minimum_age_hours' => ['required', 'numeric', 'min:0'],
            'target_age_hours' => ['nullable', 'numeric', 'gte:minimum_age_hours', 'lte:maximum_age_hours'],
            'maximum_age_hours' => ['required', 'numeric', 'gt:minimum_age_hours'],
            'active' => ['required', 'boolean'],
            'rationale' => ['required', 'string', 'min:10', 'max:1000'],
        ]);
        abort_unless(
            DB::table('process_routes')->where('part_id', $data['part_id'])->where('operation_id', $data['operation_id'])->exists(),
            422,
            'La operación no pertenece a la ruta aprobada del producto.',
        );
        $data['approved_by'] = $request->user()->id;
        $data['approved_at'] = now();
        DB::table('biological_planning_rules')->updateOrInsert(
            ['part_id' => $data['part_id'], 'operation_id' => $data['operation_id']],
            $data + ['created_at' => now(), 'updated_at' => now()],
        );
        $ruleId = (int) DB::table('biological_planning_rules')->where('part_id', $data['part_id'])->where('operation_id', $data['operation_id'])->value('id');
        $this->audit->record($request, 'BIOLOGICAL_WINDOW_APPROVED', 'biological_planning_rules', $data['rationale'], null, $data, $ruleId);

        return $this->success('Ventana biológica aprobada y disponible para la planeación finita.');
    }

    public function materialSupply(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'part_id' => ['required', 'exists:parts,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'available_at' => ['required', 'date'],
            'status' => ['required', Rule::in(['PLANNED', 'CONFIRMED'])],
            'source' => ['required', 'string', 'max:80'],
            'reference' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
        $part = DB::table('parts')->where('id', $data['part_id'])->first();
        abort_if($part === null, 422, 'El material no existe.');
        $data['unit'] = get_object_vars($part)['unit'];
        $data['created_by'] = $request->user()->id;
        $data['created_at'] = now();
        $data['updated_at'] = now();
        $eventId = DB::table('material_supply_events')->insertGetId($data);
        $this->audit->record($request, 'MATERIAL_SUPPLY_REGISTERED', 'material_supply_events', 'Disponibilidad futura de material', null, $data, $eventId);

        return $this->success('Disponibilidad registrada. Solo los suministros confirmados alimentan la planeación.');
    }

    public function workCenterOption(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'operation_id' => ['required', 'exists:operations,id'],
            'work_center_id' => ['required', 'exists:work_centers,id'],
            'priority' => ['required', 'integer', 'between:1,999'],
            'efficiency_factor' => ['required', 'numeric', 'between:0.1,10'],
            'qualification_status' => ['required', Rule::in(['PENDING', 'APPROVED', 'SUSPENDED'])],
            'valid_from' => ['nullable', 'date'],
            'valid_to' => ['nullable', 'date', 'after_or_equal:valid_from'],
            'active' => ['required', 'boolean'],
            'notes' => ['required', 'string', 'min:10', 'max:1000'],
        ]);
        $operation = DB::table('operations')->where('id', $data['operation_id'])->first();
        abort_if($operation === null, 422, 'La operación no existe.');
        abort_if((int) $operation->work_center_id === (int) $data['work_center_id'], 422, 'El centro alterno debe ser distinto del centro primario.');
        abort_unless(DB::table('work_centers')->where('id', $data['work_center_id'])->where('active', true)->exists(), 422, 'El centro alterno no está activo.');

        $data['approved_by'] = $data['qualification_status'] === 'APPROVED' ? $request->user()->id : null;
        $data['approved_at'] = $data['qualification_status'] === 'APPROVED' ? now() : null;
        DB::table('operation_work_center_options')->updateOrInsert(
            ['operation_id' => $data['operation_id'], 'work_center_id' => $data['work_center_id']],
            $data + ['created_at' => now(), 'updated_at' => now()],
        );
        $optionId = (int) DB::table('operation_work_center_options')
            ->where('operation_id', $data['operation_id'])
            ->where('work_center_id', $data['work_center_id'])
            ->value('id');
        $event = $data['qualification_status'] === 'APPROVED' ? 'ALTERNATE_WORK_CENTER_APPROVED' : 'ALTERNATE_WORK_CENTER_UPDATED';
        $this->audit->record($request, $event, 'operation_work_center_options', $data['notes'], null, $data, $optionId);

        return $this->success($data['qualification_status'] === 'APPROVED'
            ? 'Centro alterno aprobado. Participará en la siguiente optimización.'
            : 'Centro alterno actualizado. Solo las opciones aprobadas participan en el plan.');
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
