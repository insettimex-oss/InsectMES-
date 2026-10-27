<?php

namespace App\Services;

use App\Models\Container;
use App\Models\NurseryBatch;
use App\Models\Operation;
use App\Models\Parameter;
use App\Models\Part;
use App\Models\Permission;
use App\Models\ProductionOrder;
use App\Models\Role;
use App\Models\User;
use App\Models\WorkCenter;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MesDataService
{
    public function __construct(private readonly IntegrationHubService $integrationHub) {}

    /** @return array<string, mixed> */
    public function dashboard(): array
    {
        return [
            'stats' => [
                ['label' => 'Contenedores activos', 'value' => Container::where('active', true)->count(), 'detail' => 'Inventario disponible'],
                ['label' => 'Producción hoy', 'value' => DB::table('production_runs')->whereDate('occurred_at', today())->count(), 'detail' => 'Capturas registradas'],
                ['label' => 'Guardería activa', 'value' => NurseryBatch::whereNull('closed_at')->count(), 'detail' => 'Lotes N0–N5'],
                ['label' => 'Workcenters', 'value' => WorkCenter::where('active', true)->count(), 'detail' => 'Centros configurados'],
                ['label' => 'Órdenes abiertas', 'value' => DB::table('production_orders')->whereNotIn('status', ['COMPLETED', 'CANCELLED'])->count(), 'detail' => 'Plan de producción'],
                ['label' => 'Cuarentenas', 'value' => Container::where('quarantined', true)->count(), 'detail' => 'Requieren disposición'],
                ['label' => 'Alarmas ambientales', 'value' => DB::table('environmental_readings')->where('alarm_status', 'OPEN')->count(), 'detail' => 'Fuera de límites'],
                ['label' => 'Bioseguridad abierta', 'value' => DB::table('biosecurity_events')->where('status', 'OPEN')->count(), 'detail' => 'Acción requerida'],
                ['label' => 'CAPA abiertas', 'value' => DB::table('quality_deviations')->where('status', '!=', 'CLOSED')->count(), 'detail' => 'Desviaciones activas'],
                ['label' => 'Activos bloqueados', 'value' => DB::table('assets')->where('status', 'BLOCKED')->count(), 'detail' => 'Mantenimiento requerido'],
                ['label' => 'OEE promedio', 'value' => number_format((float) DB::table('oee_snapshots')->whereDate('production_date', today())->avg('oee'), 1).'%', 'detail' => 'Cierres de turno de hoy'],
            ],
            'recentRuns' => DB::table('production_runs as r')
                ->join('operations as o', 'o.id', '=', 'r.operation_id')
                ->join('containers as c', 'c.id', '=', 'r.output_container_id')
                ->leftJoin('users as u', 'u.id', '=', 'r.user_id')
                ->orderByDesc('r.occurred_at')->limit(6)
                ->get(['r.id', 'r.occurred_at', 'o.name as operation', 'c.serial', 'r.quantity_out', 'r.unit', 'u.name as operator']),
            'inventoryByType' => Container::query()->join('parts', 'parts.id', '=', 'containers.part_id')
                ->where('containers.active', true)->groupBy('parts.type')->orderBy('parts.type')
                ->get(['parts.type', DB::raw('count(*) as total')]),
        ];
    }

    /** @return array<string, mixed> */
    public function section(string $section): array
    {
        return match ($section) {
            'parts' => ['parts' => Part::orderBy('code')->get()],
            'locations' => ['locations' => DB::table('locations')->orderBy('code')->get()],
            'operations' => ['operations' => Operation::with(['workCenter', 'inputPart', 'outputPart'])->orderBy('sort_order')->get()],
            'routing' => ['routes' => DB::table('process_routes as r')->join('parts as p', 'p.id', '=', 'r.part_id')->join('operations as o', 'o.id', '=', 'r.operation_id')->join('work_centers as w', 'w.id', '=', 'o.work_center_id')->orderBy('r.sequence')->get(['r.id', 'r.sequence', 'p.code as part', 'o.code', 'o.name', 'o.area', 'o.duration_hours', 'w.code as work_center'])],
            'bom' => ['bom' => DB::table('bom_lines as b')->join('parts as p', 'p.id', '=', 'b.parent_part_id')->join('parts as c', 'c.id', '=', 'b.component_part_id')->orderBy('p.code')->get(['b.id', 'p.code as parent', 'c.code as component', 'c.description', 'b.quantity_per_unit', 'b.unit', 'b.active'])],
            'orders' => $this->orders(),
            'control' => $this->control(),
            'nursery' => ['batches' => NurseryBatch::with('container.part')->whereNull('closed_at')->orderBy('level')->get(), 'events' => DB::table('nursery_events as e')->join('nursery_batches as b', 'b.id', '=', 'e.nursery_batch_id')->join('containers as c', 'c.id', '=', 'b.container_id')->leftJoin('users as u', 'u.id', '=', 'e.user_id')->orderByDesc('e.occurred_at')->limit(15)->get(['e.id', 'e.occurred_at', 'c.serial', 'e.action', 'e.notes', 'u.name as operator'])],
            'feeding' => $this->feeding(),
            'inventory' => ['containers' => Container::with(['part', 'location'])->orderByDesc('active')->orderBy('serial')->get(), 'parts' => Part::where('active', true)->orderBy('code')->get(), 'locations' => DB::table('locations')->where('active', true)->orderBy('code')->get()],
            'logistics' => $this->logistics(),
            'trace' => ['events' => DB::table('genealogy_events as g')->leftJoin('containers as p', 'p.id', '=', 'g.parent_container_id')->join('containers as c', 'c.id', '=', 'g.child_container_id')->leftJoin('operations as o', 'o.id', '=', 'g.operation_id')->leftJoin('production_orders as po', 'po.id', '=', 'g.production_order_id')->orderByDesc('g.occurred_at')->get(['g.id', 'g.event_group', 'g.occurred_at', 'p.serial as parent', 'c.serial as child', 'o.name as operation', 'po.number as production_order', 'g.action', 'g.quantity', 'g.unit', 'g.reason']), 'containers' => Container::with(['part', 'location'])->where('active', true)->where('quarantined', false)->orderBy('serial')->get()],
            'quality' => $this->quality(),
            'environment' => $this->environment(),
            'biosecurity' => $this->biosecurity(),
            'mass-balance' => ['orders' => ProductionOrder::with(['part', 'massBalance'])->whereNotIn('status', ['CANCELLED'])->orderByDesc('created_at')->get()],
            'performance' => $this->performance(),
            'maintenance' => $this->maintenance(),
            'audit' => ['auditEvents' => DB::table('audit_events as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->orderByDesc('a.occurred_at')->limit(250)->get(['a.id', 'a.occurred_at', 'a.event', 'a.auditable_type', 'a.auditable_id', 'a.reason', 'a.ip_address', 'u.name as user'])],
            'continuity' => [
                'backupRuns' => DB::table('backup_runs')->orderByDesc('started_at')->limit(30)->get(),
                'restoreDrills' => DB::table('restore_drills as d')->leftJoin('backup_runs as b', 'b.id', '=', 'd.backup_run_id')->leftJoin('users as u', 'u.id', '=', 'd.performed_by')->orderByDesc('d.started_at')->limit(30)->get(['d.*', 'b.path as backup_path', 'u.name as performed_by_name']),
                'database' => DB::connection()->getDriverName() === 'sqlite' ? basename((string) config('database.connections.sqlite.database')) : DB::connection()->getDriverName(),
                'schedule' => 'Diario 02:00',
                'retention' => '14 días',
            ],
            'governance' => ['documents' => $this->governanceDocuments()],
            'validation' => $this->validation(),
            'integrations' => $this->integrations(),
            'parameters' => ['parameters' => Parameter::orderBy('scope')->orderBy('code')->get()],
            'costs' => $this->costs(),
            'users' => $this->users(),
            default => [],
        };
    }

    /** @return array<string, mixed> */
    private function logistics(): array
    {
        return [
            'logisticsSummary' => [
                'draftOrders' => DB::table('sales_orders')->whereIn('status', ['DRAFT', 'PICKING'])->count(),
                'readyOrders' => DB::table('sales_orders')->where('status', 'READY')->count(),
                'shippedToday' => DB::table('shipments')->where('status', 'SHIPPED')->whereDate('shipped_at', today())->count(),
                'openReturns' => DB::table('customer_returns')->where('status', 'OPEN')->count(),
                'activeRecalls' => DB::table('recall_events')->where('status', '!=', 'CLOSED')->count(),
            ],
            'customers' => DB::table('customers')->where('active', true)->orderBy('name')->get(),
            'finishedParts' => Part::query()->where('active', true)->whereIn('type', ['Producto Terminado', 'Coproducto', 'Producto'])->orderBy('code')->get(),
            'salesOrders' => DB::table('sales_orders as o')
                ->join('customers as c', 'c.id', '=', 'o.customer_id')
                ->join('sales_order_lines as l', 'l.sales_order_id', '=', 'o.id')
                ->join('parts as p', 'p.id', '=', 'l.part_id')
                ->orderByRaw("CASE o.status WHEN 'READY' THEN 1 WHEN 'PICKING' THEN 2 WHEN 'DRAFT' THEN 3 ELSE 4 END")
                ->orderBy('o.promised_at')
                ->get(['o.id', 'o.number', 'o.status', 'o.priority', 'o.requested_at', 'o.promised_at', 'o.notes', 'c.code as customer_code', 'c.name as customer', 'l.id as line_id', 'l.ordered_quantity', 'l.allocated_quantity', 'l.shipped_quantity', 'l.unit', 'p.code as part_code', 'p.description as part_name']),
            'allocations' => DB::table('shipment_allocations as a')
                ->join('sales_order_lines as l', 'l.id', '=', 'a.sales_order_line_id')
                ->join('sales_orders as o', 'o.id', '=', 'l.sales_order_id')
                ->join('containers as c', 'c.id', '=', 'a.container_id')
                ->leftJoin('locations as loc', 'loc.id', '=', 'c.location_id')
                ->leftJoin('users as u', 'u.id', '=', 'a.picked_by')
                ->whereIn('a.status', ['ALLOCATED', 'PICKED'])
                ->orderByRaw('CASE WHEN c.expires_at IS NULL THEN 1 ELSE 0 END')->orderBy('c.expires_at')->orderBy('loc.pick_priority')
                ->get(['a.id', 'a.status', 'a.quantity', 'a.picked_at', 'o.id as order_id', 'o.number as order_number', 'c.id as container_id', 'c.serial', 'c.lot_code', 'c.expires_at', 'c.quantity_current', 'l.unit', 'loc.code as location', 'u.name as picked_by']),
            'shipments' => DB::table('shipments as s')
                ->join('sales_orders as o', 'o.id', '=', 's.sales_order_id')
                ->join('customers as c', 'c.id', '=', 'o.customer_id')
                ->leftJoin('shipment_items as i', 'i.shipment_id', '=', 's.id')
                ->groupBy('s.id', 's.number', 's.status', 's.carrier', 's.tracking_number', 's.vehicle', 's.seal', 's.shipped_at', 'o.number', 'c.name')
                ->orderByDesc('s.shipped_at')
                ->get(['s.id', 's.number', 's.status', 's.carrier', 's.tracking_number', 's.vehicle', 's.seal', 's.shipped_at', 'o.number as order_number', 'c.name as customer', DB::raw('count(i.id) as item_count'), DB::raw('coalesce(sum(i.quantity), 0) as total_quantity')]),
            'shipmentItems' => DB::table('shipment_items as i')->join('shipments as s', 's.id', '=', 'i.shipment_id')->join('containers as c', 'c.id', '=', 'i.container_id')->orderByDesc('i.id')->get(['i.id', 'i.shipment_id', 's.number as shipment_number', 'c.id as container_id', 'c.serial', 'i.quantity', 'i.unit']),
            'customerReturns' => DB::table('customer_returns as r')->join('customers as c', 'c.id', '=', 'r.customer_id')->leftJoin('shipments as s', 's.id', '=', 'r.shipment_id')->leftJoin('containers as x', 'x.id', '=', 'r.container_id')->orderByDesc('r.received_at')->get(['r.id', 'r.number', 'r.quantity', 'r.unit', 'r.reason', 'r.disposition', 'r.status', 'r.received_at', 'r.notes', 'c.name as customer', 's.number as shipment_number', 'x.serial as container']),
            'recalls' => DB::table('recall_events as r')->leftJoin('recall_impacted_containers as i', 'i.recall_event_id', '=', 'r.id')->leftJoin('customers as c', 'c.id', '=', 'i.customer_id')->groupBy('r.id', 'r.number', 'r.type', 'r.reference_type', 'r.reference', 'r.reason', 'r.status', 'r.started_at', 'r.closed_at')->orderByDesc('r.started_at')->get(['r.id', 'r.number', 'r.type', 'r.reference_type', 'r.reference', 'r.reason', 'r.status', 'r.started_at', 'r.closed_at', DB::raw('count(distinct i.container_id) as impacted_containers'), DB::raw('count(distinct c.id) as impacted_customers')]),
        ];
    }

    /** @return array<string, mixed> */
    private function users(): array
    {
        $users = User::query()->with(['assignedRole.permissions', 'permissionOverrides'])->orderBy('name')->get()->map(fn (User $user): array => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'company' => $user->company,
            'role_id' => $user->role_id,
            'role' => $user->roleName(),
            'role_slug' => $user->roleSlug(),
            'area' => $user->assignedRole()->value('area'),
            'is_active' => $user->is_active,
            'must_change_password' => $user->must_change_password,
            'email_verified_at' => $user->email_verified_at,
            'permissions' => $user->effectivePermissionKeys(),
            'created_at' => $user->created_at,
        ]);

        $roles = Role::query()->with('permissions:id,key')->orderBy('area')->orderBy('name')->get()->map(fn (Role $role): array => [
            'id' => $role->id,
            'slug' => $role->slug,
            'name' => $role->name,
            'area' => $role->area,
            'description' => $role->description,
            'permissions' => $role->permissions->pluck('key')->sort()->values()->all(),
        ]);

        return [
            'users' => $users,
            'roles' => $roles,
            'permissions' => Permission::query()->orderBy('module')->orderByRaw("CASE action WHEN 'read' THEN 1 WHEN 'write' THEN 2 WHEN 'approve' THEN 3 ELSE 4 END")->get(['key', 'module', 'action', 'name', 'description']),
        ];
    }

    /** @return array<string, mixed> */
    private function orders(): array
    {
        $currentRun = DB::table('planning_runs')->where('status', 'CURRENT')->latest('id')->first();
        $currentRunId = $currentRun === null ? null : (int) get_object_vars($currentRun)['id'];

        return [
            'orders' => ProductionOrder::with(['part', 'operations.operation', 'massBalance'])->orderByRaw("CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END")->orderBy('scheduled_start')->get(),
            'parts' => Part::where('active', true)
                ->whereIn('type', ['WIP', 'Producto Terminado'])
                ->whereIn('id', DB::table('process_routes')->select('part_id')->distinct())
                ->orderBy('code')
                ->get(),
            'planningRun' => $currentRun,
            'planningRuns' => DB::table('planning_runs')->leftJoin('users', 'users.id', '=', 'planning_runs.created_by')->orderByDesc('planning_runs.id')->limit(10)->get(['planning_runs.*', 'users.name as created_by_name']),
            'planningCapacities' => DB::table('work_center_shift_capacities as c')->join('work_centers as w', 'w.id', '=', 'c.work_center_id')->join('shifts as s', 's.id', '=', 'c.shift_id')->orderBy('w.code')->orderBy('s.starts_at')->get(['c.id', 'c.work_center_id', 'c.shift_id', 'c.available_minutes', 'c.active', 'w.code as work_center', 'w.description as work_center_name', 's.code as shift', 's.name as shift_name', 's.starts_at', 's.ends_at']),
            'planningSegments' => $currentRunId === null ? collect() : DB::table('production_schedule_segments as g')->join('production_order_operations as po', 'po.id', '=', 'g.production_order_operation_id')->join('production_orders as p', 'p.id', '=', 'po.production_order_id')->join('operations as o', 'o.id', '=', 'po.operation_id')->join('work_centers as w', 'w.id', '=', 'g.work_center_id')->join('shifts as s', 's.id', '=', 'g.shift_id')->leftJoin('production_campaigns as c', 'c.id', '=', 'g.campaign_id')->where('g.planning_run_id', $currentRunId)->orderBy('g.planned_start')->get(['g.id', 'p.number as order_number', 'p.priority', 'o.code as operation', 'o.name as operation_name', 'w.code as work_center', 's.code as shift', 'c.code as campaign_code', 'c.family as campaign_family', 'g.segment_sequence', 'g.segment_type', 'g.planned_start', 'g.planned_end', 'g.planned_minutes', 'g.notes']),
            'planningOccupancies' => $currentRunId === null ? collect() : DB::table('biological_schedule_occupancies as b')->join('production_order_operations as po', 'po.id', '=', 'b.production_order_operation_id')->join('production_orders as p', 'p.id', '=', 'po.production_order_id')->join('operations as o', 'o.id', '=', 'po.operation_id')->join('work_centers as w', 'w.id', '=', 'b.work_center_id')->leftJoin('production_campaigns as c', 'c.id', '=', 'b.campaign_id')->where('b.planning_run_id', $currentRunId)->orderBy('b.planned_start')->get(['b.id', 'p.number as order_number', 'o.code as operation', 'o.name as operation_name', 'w.code as work_center', 'w.parallel_capacity', 'c.code as campaign_code', 'b.planned_start', 'b.planned_end', 'b.capacity_units']),
            'planningCampaigns' => DB::table('production_campaigns as c')->leftJoin('parts as p', 'p.id', '=', 'c.part_id')->leftJoin('users as u', 'u.id', '=', 'c.created_by')->orderBy('c.priority')->orderBy('c.code')->get(['c.id', 'c.code', 'c.name', 'c.family', 'c.part_id', 'c.priority', 'c.planned_start', 'c.planned_end', 'c.status', 'c.active', 'c.notes', 'p.code as part_code', 'p.description as part_name', 'u.name as created_by_name']),
            'changeoverRules' => DB::table('work_center_changeover_rules as r')->join('work_centers as w', 'w.id', '=', 'r.work_center_id')->orderBy('w.code')->orderBy('r.from_family')->get(['r.id', 'r.work_center_id', 'r.from_family', 'r.to_family', 'r.setup_minutes', 'r.cleaning_required', 'r.active', 'r.notes', 'w.code as work_center', 'w.description as work_center_name']),
            'workCenterOptions' => DB::table('operation_work_center_options as option')->join('operations as operation', 'operation.id', '=', 'option.operation_id')->join('work_centers as primary_center', 'primary_center.id', '=', 'operation.work_center_id')->join('work_centers as alternate_center', 'alternate_center.id', '=', 'option.work_center_id')->leftJoin('users as approver', 'approver.id', '=', 'option.approved_by')->orderBy('operation.code')->orderBy('option.priority')->get(['option.id', 'option.operation_id', 'option.work_center_id', 'option.priority', 'option.efficiency_factor', 'option.qualification_status', 'option.valid_from', 'option.valid_to', 'option.active', 'option.notes', 'option.approved_at', 'operation.code as operation_code', 'operation.name as operation_name', 'primary_center.code as primary_center', 'alternate_center.code as alternate_center', 'alternate_center.description as alternate_center_name', 'approver.name as approved_by_name']),
            'biologicalRules' => DB::table('biological_planning_rules as b')->join('parts as p', 'p.id', '=', 'b.part_id')->join('operations as o', 'o.id', '=', 'b.operation_id')->leftJoin('users as u', 'u.id', '=', 'b.approved_by')->orderBy('p.code')->orderBy('b.minimum_age_hours')->get(['b.id', 'b.part_id', 'b.operation_id', 'b.minimum_age_hours', 'b.target_age_hours', 'b.maximum_age_hours', 'b.active', 'b.rationale', 'b.approved_at', 'p.code as part_code', 'p.description as part_name', 'o.code as operation_code', 'o.name as operation_name', 'o.scheduling_mode', 'u.name as approved_by_name']),
            'materialSupplyEvents' => DB::table('material_supply_events as m')->join('parts as p', 'p.id', '=', 'm.part_id')->leftJoin('users as u', 'u.id', '=', 'm.created_by')->orderBy('m.available_at')->get(['m.id', 'm.part_id', 'm.quantity', 'm.unit', 'm.available_at', 'm.status', 'm.source', 'm.reference', 'm.notes', 'p.code as part_code', 'p.description as part_name', 'u.name as created_by_name']),
            'planningMaterialAllocations' => $currentRunId === null ? collect() : DB::table('planning_material_allocations as a')->join('production_orders as o', 'o.id', '=', 'a.production_order_id')->join('parts as p', 'p.id', '=', 'a.part_id')->leftJoin('material_supply_events as m', 'm.id', '=', 'a.material_supply_event_id')->where('a.planning_run_id', $currentRunId)->orderBy('a.available_at')->get(['a.id', 'o.number as order_number', 'p.code as part_code', 'p.description as part_name', 'a.source', 'a.quantity', 'a.available_at', 'm.reference']),
            'planningOperations' => DB::table('process_routes as r')->join('parts as p', 'p.id', '=', 'r.part_id')->join('operations as o', 'o.id', '=', 'r.operation_id')->join('work_centers as w', 'w.id', '=', 'o.work_center_id')->orderBy('p.code')->orderBy('r.sequence')->get(['p.id as part_id', 'p.code as part_code', 'p.description as part_name', 'o.id as operation_id', 'o.code as operation_code', 'o.name as operation_name', 'o.scheduling_mode', 'o.work_center_id as primary_work_center_id', 'w.code as primary_work_center']),
            'planningParts' => Part::where('active', true)->orderBy('code')->get(['id', 'code', 'description', 'unit', 'type']),
            'workCenters' => DB::table('work_centers')->where('active', true)->orderBy('code')->get(['id', 'code', 'description', 'parallel_capacity']),
            'shifts' => DB::table('shifts')->where('active', true)->orderBy('starts_at')->get(['id', 'code', 'name', 'starts_at', 'ends_at']),
        ];
    }

    /** @return array<string, mixed> */
    private function control(): array
    {
        return [
            'operations' => Operation::with(['workCenter', 'inputPart', 'outputPart'])->where('active', true)->orderBy('sort_order')->get(),
            'containers' => Container::with(['part', 'location'])->where('active', true)->where('quarantined', false)->where('quantity_current', '>', 0)->orderBy('serial')->get(),
            'orderOperations' => DB::table('production_order_operations as po')
                ->join('production_orders as p', 'p.id', '=', 'po.production_order_id')
                ->join('parts as part', 'part.id', '=', 'p.part_id')
                ->join('operations as o', 'o.id', '=', 'po.operation_id')
                ->join('work_centers as w', 'w.id', '=', DB::raw('COALESCE(po.planned_work_center_id, o.work_center_id)'))
                ->leftJoin('work_instructions as wi', 'wi.id', '=', 'po.work_instruction_id')
                ->whereIn('p.status', ['RELEASED', 'IN_PROGRESS'])
                ->whereIn('po.status', ['PENDING', 'READY', 'IN_PROGRESS'])
                ->orderByRaw("CASE p.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END")
                ->orderBy('p.scheduled_start')->orderBy('po.sequence')
                ->get(['po.id', 'po.production_order_id', 'po.operation_id', 'po.status', 'po.sequence', 'po.planned_quantity', 'po.actual_output', 'po.actual_scrap', 'po.active_minutes', 'p.number as order_number', 'p.priority', 'p.scheduled_start', 'p.scheduled_end', 'p.unit', 'part.code as part_code', 'part.description as part_name', 'o.code as operation_code', 'o.name as operation_name', 'w.code as work_center', 'wi.title as instruction_title', 'wi.steps as instruction_steps']),
            'executionSessions' => DB::table('production_execution_sessions as s')
                ->join('production_order_operations as po', 'po.id', '=', 's.production_order_operation_id')
                ->leftJoin('users as u', 'u.id', '=', 's.operator_id')
                ->whereIn('s.status', ['RUNNING', 'PAUSED'])
                ->orderByDesc('s.started_at')
                ->get(['s.id', 's.production_order_operation_id', 's.work_center_id', 's.status', 's.started_at', 's.last_resumed_at', 's.paused_at', 's.active_minutes', 's.pause_reason', 'u.name as operator']),
            'checklistItems' => DB::table('production_checklist_items as c')
                ->leftJoin('users as u', 'u.id', '=', 'c.completed_by')
                ->orderBy('c.production_order_operation_id')->orderBy('c.step_index')
                ->get(['c.id', 'c.production_order_operation_id', 'c.step_index', 'c.description', 'c.completed', 'c.completed_at', 'u.name as completed_by']),
            'scrapReasons' => DB::table('scrap_reason_codes')->where('active', true)->orderBy('category')->orderBy('code')->get(),
            'recentScrap' => DB::table('production_scrap_events as e')
                ->join('production_order_operations as po', 'po.id', '=', 'e.production_order_operation_id')
                ->join('production_orders as p', 'p.id', '=', 'po.production_order_id')
                ->join('operations as o', 'o.id', '=', 'po.operation_id')
                ->join('scrap_reason_codes as r', 'r.id', '=', 'e.scrap_reason_code_id')
                ->leftJoin('containers as c', 'c.id', '=', 'e.container_id')
                ->leftJoin('users as u', 'u.id', '=', 'e.reported_by')
                ->orderByDesc('e.reported_at')->limit(25)
                ->get(['e.id', 'e.quantity', 'e.unit', 'e.notes', 'e.reported_at', 'p.number as order_number', 'o.code as operation', 'r.code as reason_code', 'r.name as reason', 'c.serial as container', 'u.name as operator']),
            'shopFloorSummary' => [
                'ready' => DB::table('production_order_operations as po')->join('production_orders as p', 'p.id', '=', 'po.production_order_id')->whereIn('p.status', ['RELEASED', 'IN_PROGRESS'])->where('po.status', 'READY')->count(),
                'running' => DB::table('production_execution_sessions')->where('status', 'RUNNING')->count(),
                'paused' => DB::table('production_execution_sessions')->where('status', 'PAUSED')->count(),
                'completedToday' => DB::table('production_order_operations')->where('status', 'COMPLETED')->whereDate('completed_at', today())->count(),
                'scrapToday' => round((float) DB::table('production_scrap_events')->whereDate('reported_at', today())->sum('quantity'), 2),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function quality(): array
    {
        return [
            'qualitySpecifications' => DB::table('quality_specifications')->where('active', true)->orderBy('stage')->orderBy('code')->get(),
            'qualityInspections' => DB::table('quality_inspections as q')->join('quality_specifications as s', 's.id', '=', 'q.quality_specification_id')->leftJoin('containers as c', 'c.id', '=', 'q.container_id')->leftJoin('production_orders as po', 'po.id', '=', 'q.production_order_id')->leftJoin('users as u', 'u.id', '=', 'q.inspected_by')->orderByDesc('q.occurred_at')->get(['q.id', 'q.number', 'q.occurred_at', 's.code as specification', 's.characteristic', 'q.result_value', 's.unit', 'q.status', 'q.disposition', 'c.serial as container', 'po.number as production_order', 'u.name as inspector']),
            'containers' => Container::with('part')->where('active', true)->orderBy('serial')->get(),
            'orders' => ProductionOrder::whereNotIn('status', ['CANCELLED'])->orderByDesc('created_at')->get(),
            'qualityDeviations' => DB::table('quality_deviations as d')->leftJoin('production_orders as po', 'po.id', '=', 'd.production_order_id')->leftJoin('containers as c', 'c.id', '=', 'd.container_id')->leftJoin('users as u', 'u.id', '=', 'd.owner_id')->orderByRaw("CASE d.status WHEN 'CLOSED' THEN 2 ELSE 1 END")->orderByDesc('d.created_at')->get(['d.id', 'd.number', 'd.source', 'd.severity', 'd.status', 'd.title', 'd.description', 'd.root_cause', 'd.disposition', 'd.due_at', 'd.closed_at', 'po.number as production_order', 'c.serial as container', 'u.name as owner']),
            'correctiveActions' => DB::table('corrective_actions as a')->join('quality_deviations as d', 'd.id', '=', 'a.quality_deviation_id')->leftJoin('users as u', 'u.id', '=', 'a.owner_id')->orderBy('a.due_at')->get(['a.id', 'a.quality_deviation_id', 'd.number as deviation', 'a.type', 'a.description', 'a.status', 'a.due_at', 'a.effectiveness_result', 'u.name as owner']),
            'certificates' => DB::table('certificates_of_analysis as c')->leftJoin('production_orders as po', 'po.id', '=', 'c.production_order_id')->leftJoin('containers as x', 'x.id', '=', 'c.container_id')->leftJoin('users as u', 'u.id', '=', 'c.approved_by')->leftJoin('certificate_results as r', 'r.certificate_of_analysis_id', '=', 'c.id')->groupBy('c.id', 'c.number', 'c.status', 'c.created_at', 'c.approved_at', 'c.notes', 'po.number', 'x.serial', 'u.name')->orderByDesc('c.created_at')->get(['c.id', 'c.number', 'c.status', 'c.created_at', 'c.approved_at', 'c.notes', 'po.number as production_order', 'x.serial as container', 'u.name as approver', DB::raw('count(r.id) as result_count')]),
            'retentionSamples' => DB::table('retention_samples as r')->join('containers as c', 'c.id', '=', 'r.container_id')->leftJoin('production_orders as po', 'po.id', '=', 'r.production_order_id')->orderByDesc('r.retained_at')->get(['r.id', 'r.code', 'c.serial as container', 'po.number as production_order', 'r.quantity', 'r.unit', 'r.storage_location', 'r.retained_at', 'r.expires_at', 'r.status']),
            'laboratoryMethods' => DB::table('laboratory_methods')->where('active', true)->orderBy('category')->orderBy('code')->get(),
            'laboratorySamples' => DB::table('laboratory_samples as s')->leftJoin('containers as c', 'c.id', '=', 's.container_id')->leftJoin('production_orders as po', 'po.id', '=', 's.production_order_id')->leftJoin('users as u', 'u.id', '=', 's.received_by')->leftJoin('laboratory_results as r', 'r.laboratory_sample_id', '=', 's.id')->groupBy('s.id', 's.number', 's.purpose', 's.status', 's.received_at', 's.due_at', 's.completed_at', 's.notes', 'c.serial', 'po.number', 'u.name')->orderByDesc('s.received_at')->get(['s.id', 's.number', 's.purpose', 's.status', 's.received_at', 's.due_at', 's.completed_at', 's.notes', 'c.serial as container', 'po.number as production_order', 'u.name as receiver', DB::raw('count(r.id) as result_count')]),
            'laboratoryResults' => DB::table('laboratory_results as r')->join('laboratory_samples as s', 's.id', '=', 'r.laboratory_sample_id')->join('laboratory_methods as m', 'm.id', '=', 'r.laboratory_method_id')->leftJoin('containers as c', 'c.id', '=', 's.container_id')->leftJoin('production_orders as po', 'po.id', '=', 's.production_order_id')->leftJoin('users as u', 'u.id', '=', 'r.tested_by')->orderByDesc('r.tested_at')->get(['r.id', 'r.tested_at', 'r.result_value', 'r.result_text', 'r.status', 'r.notes', 's.number as sample', 'm.code as method', 'm.name as method_name', 'm.unit', 'c.serial as container', 'po.number as production_order', 'u.name as analyst']),
        ];
    }

    /** @return array<string, mixed> */
    private function feeding(): array
    {
        return [
            'feedingEvents' => DB::table('feeding_events as f')->join('containers as t', 't.id', '=', 'f.target_container_id')->join('containers as s', 's.id', '=', 'f.substrate_container_id')->leftJoin('production_orders as po', 'po.id', '=', 'f.production_order_id')->leftJoin('users as u', 'u.id', '=', 'f.recorded_by')->orderByDesc('f.occurred_at')->limit(200)->get(['f.id', 'f.occurred_at', 't.serial as target', 's.serial as substrate', 'f.quantity', 'f.unit', 'f.dry_matter_percent', 'f.notes', 'po.number as production_order', 'u.name as operator']),
            'targetContainers' => Container::with('part')->where('active', true)->where('quarantined', false)->whereHas('part', fn ($query) => $query->whereIn('type', ['WIP', 'Biológico']))->orderBy('serial')->get(),
            'substrateContainers' => Container::with('part')->where('active', true)->where('quarantined', false)->where('quantity_current', '>', 0)->whereHas('part', fn ($query) => $query->whereIn('type', ['Materia Prima', 'Material']))->orderBy('serial')->get(),
            'orders' => ProductionOrder::whereIn('status', ['RELEASED', 'IN_PROGRESS'])->orderBy('scheduled_start')->get(),
        ];
    }

    /** @return array<string, mixed> */
    private function maintenance(): array
    {
        return [
            'assets' => DB::table('assets as a')->leftJoin('work_centers as w', 'w.id', '=', 'a.work_center_id')->leftJoin('locations as l', 'l.id', '=', 'a.location_id')->where('a.active', true)->orderByRaw("CASE a.status WHEN 'BLOCKED' THEN 1 WHEN 'MAINTENANCE' THEN 2 ELSE 3 END")->orderBy('a.code')->get(['a.id', 'a.code', 'a.name', 'a.type', 'a.status', 'a.criticality', 'a.manufacturer', 'a.serial_number', 'a.next_maintenance_at', 'a.calibration_due_at', 'w.code as work_center', 'l.code as location']),
            'workOrders' => DB::table('maintenance_work_orders as m')->join('assets as a', 'a.id', '=', 'm.asset_id')->leftJoin('users as u', 'u.id', '=', 'm.assigned_to')->orderByRaw("CASE m.status WHEN 'COMPLETED' THEN 2 ELSE 1 END")->orderByDesc('m.created_at')->get(['m.id', 'm.number', 'a.code as asset', 'a.name as asset_name', 'm.type', 'm.priority', 'm.status', 'm.description', 'm.scheduled_at', 'm.completed_at', 'm.downtime_minutes', 'm.result', 'u.name as technician']),
            'workCenters' => WorkCenter::where('active', true)->orderBy('code')->get(),
            'locations' => DB::table('locations')->where('active', true)->orderBy('code')->get(),
            'spareParts' => DB::table('spare_parts')->where('active', true)->orderBy('code')->get(),
            'spareUsages' => DB::table('maintenance_spare_part_usages as u')->join('maintenance_work_orders as m', 'm.id', '=', 'u.maintenance_work_order_id')->join('spare_parts as s', 's.id', '=', 'u.spare_part_id')->orderByDesc('u.created_at')->get(['u.id', 'm.number as work_order', 's.code as spare_part', 's.name', 'u.quantity', 's.unit', 'u.created_at']),
            'conditionReadings' => DB::table('maintenance_condition_readings as r')->join('assets as a', 'a.id', '=', 'r.asset_id')->leftJoin('users as u', 'u.id', '=', 'r.recorded_by')->orderByDesc('r.measured_at')->limit(250)->get(['r.id', 'r.metric', 'r.value', 'r.unit', 'r.warning_limit', 'r.critical_limit', 'r.status', 'r.measured_at', 'r.notes', 'a.code as asset', 'a.name as asset_name', 'u.name as operator']),
            'maintenanceKpis' => $this->maintenanceKpis(),
        ];
    }

    /** @return array{summary: array<string, int|float|null>, assets: array<int, array<string, int|float|string|null>>} */
    private function maintenanceKpis(): array
    {
        $failures = DB::table('maintenance_work_orders as m')
            ->join('assets as a', 'a.id', '=', 'm.asset_id')
            ->where('m.type', 'CORRECTIVE')
            ->where('m.status', 'COMPLETED')
            ->orderBy('m.created_at')
            ->get(['m.asset_id', 'm.created_at', 'm.downtime_minutes', 'a.code', 'a.name']);

        $assets = $failures->groupBy('asset_id')->map(function ($rows): array {
            $intervals = $rows->pluck('created_at')->map(fn ($value) => Carbon::parse($value))->values()->sliding(2)->map(
                fn ($pair) => $pair[0]->diffInMinutes($pair[1])
            );

            return [
                'asset' => (string) $rows->first()->code,
                'asset_name' => (string) $rows->first()->name,
                'failures' => $rows->count(),
                'mttr_minutes' => round((float) $rows->avg('downtime_minutes'), 1),
                'mtbf_minutes' => $intervals->isEmpty() ? null : round((float) $intervals->avg(), 1),
            ];
        })->values()->all();

        $allIntervals = collect($assets)->pluck('mtbf_minutes')->filter(fn ($value) => $value !== null);

        return [
            'summary' => [
                'failures' => $failures->count(),
                'mttr_minutes' => $failures->isEmpty() ? null : round((float) $failures->avg('downtime_minutes'), 1),
                'mtbf_minutes' => $allIntervals->isEmpty() ? null : round((float) $allIntervals->avg(), 1),
                'critical_readings' => DB::table('maintenance_condition_readings')->where('status', 'CRITICAL')->count(),
            ],
            'assets' => $assets,
        ];
    }

    /** @return array<string, mixed> */
    private function performance(): array
    {
        return [
            'shifts' => DB::table('shifts')->where('active', true)->orderBy('starts_at')->get(),
            'downtimeReasons' => DB::table('downtime_reasons')->where('active', true)->orderBy('category')->orderBy('name')->get(),
            'downtimeEvents' => DB::table('downtime_events as d')->join('work_centers as w', 'w.id', '=', 'd.work_center_id')->join('downtime_reasons as r', 'r.id', '=', 'd.downtime_reason_id')->leftJoin('production_orders as po', 'po.id', '=', 'd.production_order_id')->orderByRaw("CASE d.status WHEN 'OPEN' THEN 1 ELSE 2 END")->orderByDesc('d.started_at')->limit(200)->get(['d.id', 'd.number', 'w.code as work_center', 'r.name as reason', 'r.category', 'po.number as production_order', 'd.status', 'd.started_at', 'd.ended_at', 'd.duration_minutes', 'd.notes']),
            'oeeSnapshots' => DB::table('oee_snapshots as o')->join('work_centers as w', 'w.id', '=', 'o.work_center_id')->join('shifts as s', 's.id', '=', 'o.shift_id')->orderByDesc('o.production_date')->orderBy('s.starts_at')->limit(200)->get(['o.id', 'o.production_date', 's.code as shift', 'w.code as work_center', 'o.planned_minutes', 'o.downtime_minutes', 'o.total_count', 'o.good_count', 'o.availability', 'o.performance', 'o.quality', 'o.oee', 'o.notes']),
            'workCenters' => WorkCenter::where('active', true)->orderBy('code')->get(),
            'orders' => ProductionOrder::whereIn('status', ['RELEASED', 'IN_PROGRESS'])->orderBy('scheduled_start')->get(),
            'oeeSummary' => [
                'oee' => round((float) DB::table('oee_snapshots')->avg('oee'), 1),
                'openDowntimes' => DB::table('downtime_events')->where('status', 'OPEN')->count(),
                'downtimeMinutes' => (int) DB::table('downtime_events')->whereDate('started_at', today())->sum('duration_minutes'),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function environment(): array
    {
        return [
            'environmentalLimits' => DB::table('environmental_limits')->where('active', true)->orderBy('stage')->orderBy('parameter')->get(),
            'environmentalReadings' => DB::table('environmental_readings as r')->join('environmental_limits as l', 'l.id', '=', 'r.environmental_limit_id')->join('locations as x', 'x.id', '=', 'r.location_id')->leftJoin('users as u', 'u.id', '=', 'r.recorded_by')->orderByDesc('r.recorded_at')->limit(200)->get(['r.id', 'r.recorded_at', 'l.stage', 'l.parameter', 'r.value', 'l.unit', 'l.min_value', 'l.max_value', 'r.source', 'r.within_limits', 'r.alarm_status', 'r.evidence', 'x.code as location', 'u.name as operator']),
            'locations' => DB::table('locations')->where('active', true)->orderBy('code')->get(),
        ];
    }

    /** @return array<string, mixed> */
    private function biosecurity(): array
    {
        return [
            'biosecurityEvents' => DB::table('biosecurity_events as b')->leftJoin('locations as l', 'l.id', '=', 'b.location_id')->leftJoin('users as u', 'u.id', '=', 'b.reported_by')->orderByRaw("CASE b.status WHEN 'OPEN' THEN 1 ELSE 2 END")->orderByDesc('b.occurred_at')->get(['b.id', 'b.number', 'b.occurred_at', 'b.type', 'b.severity', 'b.status', 'b.observation', 'b.immediate_action', 'b.corrective_action', 'l.code as location', 'u.name as reporter']),
            'locations' => DB::table('locations')->where('active', true)->orderBy('code')->get(),
        ];
    }

    /** @return list<array<string, string>> */
    private function governanceDocuments(): array
    {
        return [
            ['code' => 'F0-01', 'name' => 'Mapa de procesos BSF', 'file' => '01-process-map-bsf.md', 'status' => 'APROBACIÓN COMPLETADA · EVIDENCIA POR VINCULAR'],
            ['code' => 'F0-02', 'name' => 'URS - Requisitos de usuario', 'file' => '02-urs.md', 'status' => 'APROBACIÓN COMPLETADA · REGISTRO INCOMPLETO'],
            ['code' => 'F0-03', 'name' => 'Registro de riesgos', 'file' => '03-risk-register.md', 'status' => 'APROBACIÓN COMPLETADA · EVIDENCIA POR VINCULAR'],
            ['code' => 'F0-04', 'name' => 'Gobierno de datos maestros', 'file' => '04-master-data-governance.md', 'status' => 'APROBACIÓN COMPLETADA · EVIDENCIA POR VINCULAR'],
            ['code' => 'F0-05', 'name' => 'Métodos de medición', 'file' => '05-measurement-methods.md', 'status' => 'APROBACIÓN COMPLETADA · EVIDENCIA POR VINCULAR'],
            ['code' => 'F0-06', 'name' => 'Matriz regulatoria', 'file' => '06-regulatory-matrix.md', 'status' => 'APROBACIÓN INTERNA COMPLETADA · DICTAMEN EXTERNO ABIERTO'],
            ['code' => 'F0-07', 'name' => 'Definición de lote y trazabilidad', 'file' => '07-lot-and-traceability-definition.md', 'status' => 'APROBACIÓN COMPLETADA · REGISTRO INCOMPLETO'],
            ['code' => 'F0-08', 'name' => 'Registro consolidado de aprobaciones', 'file' => '08-approval-register.md', 'status' => 'VERIFICACIÓN DOCUMENTAL EN CURSO'],
        ];
    }

    /** @return array<string, mixed> */
    private function validation(): array
    {
        return [
            'validationProtocols' => DB::table('validation_protocols as p')
                ->leftJoin('users as c', 'c.id', '=', 'p.created_by')
                ->leftJoin('users as a', 'a.id', '=', 'p.approved_by')
                ->select(['p.id', 'p.code', 'p.title', 'p.version', 'p.scope', 'p.objective', 'p.acceptance_criteria', 'p.status', 'p.approved_at', 'c.name as created_by_name', 'a.name as approved_by_name'])
                ->selectSub(fn ($query) => $query->from('validation_protocol_steps as s')->whereColumn('s.validation_protocol_id', 'p.id')->selectRaw('count(*)'), 'step_count')
                ->orderByDesc('p.created_at')->get(),
            'validationRuns' => DB::table('validation_runs as r')
                ->join('validation_protocols as p', 'p.id', '=', 'r.validation_protocol_id')
                ->leftJoin('production_orders as o', 'o.id', '=', 'r.production_order_id')
                ->leftJoin('users as e', 'e.id', '=', 'r.executed_by')
                ->leftJoin('users as a', 'a.id', '=', 'r.approved_by')
                ->select(['r.id', 'r.number', 'r.status', 'r.started_at', 'r.completed_at', 'r.approved_at', 'r.result_summary', 'r.evidence_reference', 'p.code as protocol_code', 'p.version as protocol_version', 'p.title as protocol_title', 'o.number as production_order', 'e.name as executed_by_name', 'a.name as approved_by_name'])
                ->selectSub(fn ($query) => $query->from('validation_run_steps as s')->whereColumn('s.validation_run_id', 'r.id')->selectRaw('count(*)'), 'step_count')
                ->selectSub(fn ($query) => $query->from('validation_run_steps as s')->whereColumn('s.validation_run_id', 'r.id')->where('s.status', 'PASS')->selectRaw('count(*)'), 'passed_steps')
                ->selectSub(fn ($query) => $query->from('validation_run_steps as s')->whereColumn('s.validation_run_id', 'r.id')->where('s.status', 'FAIL')->selectRaw('count(*)'), 'failed_steps')
                ->selectSub(fn ($query) => $query->from('validation_run_steps as s')->whereColumn('s.validation_run_id', 'r.id')->where('s.status', 'PENDING')->selectRaw('count(*)'), 'pending_steps')
                ->orderByDesc('r.started_at')->limit(100)->get(),
            'validationSteps' => DB::table('validation_run_steps as s')
                ->join('validation_runs as r', 'r.id', '=', 's.validation_run_id')
                ->leftJoin('users as u', 'u.id', '=', 's.executed_by')
                ->orderByDesc('r.started_at')->orderBy('s.sequence')
                ->limit(500)->get(['s.id', 's.validation_run_id', 'r.number as run_number', 'r.status as run_status', 's.sequence', 's.requirement', 's.expected_result', 's.actual_result', 's.status', 's.critical', 's.evidence_reference', 's.executed_at', 'u.name as executed_by_name']),
            'electronicSignatures' => DB::table('electronic_signatures as s')
                ->orderByDesc('s.signed_at')->limit(200)
                ->get(['s.id', 's.signable_type', 's.signable_id', 's.meaning', 's.signer_name', 's.role_at_signing', 's.reason', 's.signed_at', 's.digest_sha256']),
            'approvedValidationProtocols' => DB::table('validation_protocols')->where('status', 'APPROVED')->orderBy('code')->get(['id', 'code', 'title', 'version']),
            'validationOrders' => ProductionOrder::query()->whereNotIn('status', ['CANCELLED'])->orderByDesc('created_at')->get(['id', 'number', 'status']),
            'validationSummary' => [
                'approvedProtocols' => DB::table('validation_protocols')->where('status', 'APPROVED')->count(),
                'activeRuns' => DB::table('validation_runs')->where('status', 'IN_PROGRESS')->count(),
                'pendingApproval' => DB::table('validation_runs')->where('status', 'AWAITING_APPROVAL')->count(),
                'passedRuns' => DB::table('validation_runs')->where('status', 'PASSED')->count(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function integrations(): array
    {
        $resolved = DB::table('integration_messages')->whereIn('status', ['ACKNOWLEDGED', 'FAILED', 'QUARANTINED'])->count();
        $acknowledged = DB::table('integration_messages')->where('status', 'ACKNOWLEDGED')->count();
        $endpoints = DB::table('integration_endpoints as e')
            ->leftJoin('users as u', 'u.id', '=', 'e.created_by')
            ->orderByDesc('e.active')->orderBy('e.code')
            ->get(['e.id', 'e.code', 'e.name', 'e.system', 'e.direction', 'e.transport', 'e.connector_driver', 'e.base_url', 'e.auth_scheme', 'e.username_env_key', 'e.secret_env_key', 'e.timeout_seconds', 'e.max_attempts', 'e.retry_backoff_seconds', 'e.active', 'e.health_status', 'e.last_health_at', 'e.last_health_message', 'u.name as created_by_name'])
            ->map(function (object $endpoint): object {
                $readiness = $this->integrationHub->endpointReadiness($endpoint);
                $endpoint->runtime_ready = $readiness['ready'];
                $endpoint->readiness_message = $readiness['message'];

                return $endpoint;
            });

        return [
            'integrationEndpoints' => $endpoints,
            'integrationMessages' => DB::table('integration_messages as m')
                ->join('integration_endpoints as e', 'e.id', '=', 'm.integration_endpoint_id')
                ->leftJoin('users as u', 'u.id', '=', 'm.created_by')
                ->orderByDesc('m.created_at')->limit(300)
                ->get(['m.id', 'm.uuid', 'm.direction', 'm.message_type', 'm.idempotency_key', 'm.correlation_id', 'm.entity_type', 'm.entity_id', 'm.payload_sha256', 'm.status', 'm.attempt_count', 'm.next_attempt_at', 'm.last_error', 'm.response_code', 'm.response_excerpt', 'm.dispatched_at', 'm.acknowledged_at', 'm.created_at', 'e.code as endpoint_code', 'e.name as endpoint_name', 'e.transport', 'u.name as created_by_name']),
            'integrationAttempts' => DB::table('integration_attempts as a')
                ->join('integration_messages as m', 'm.id', '=', 'a.integration_message_id')
                ->join('integration_endpoints as e', 'e.id', '=', 'm.integration_endpoint_id')
                ->orderByDesc('a.started_at')->limit(300)
                ->get(['a.id', 'm.uuid as message_uuid', 'e.code as endpoint_code', 'a.attempt_number', 'a.status', 'a.started_at', 'a.finished_at', 'a.duration_ms', 'a.response_code', 'a.response_excerpt', 'a.error']),
            'integrationReconciliations' => DB::table('integration_reconciliations as r')
                ->join('integration_endpoints as e', 'e.id', '=', 'r.integration_endpoint_id')
                ->leftJoin('users as u', 'u.id', '=', 'r.generated_by')
                ->orderByDesc('r.generated_at')->limit(100)
                ->get(['r.id', 'e.code as endpoint_code', 'r.period_from', 'r.period_to', 'r.expected_count', 'r.observed_count', 'r.acknowledged_count', 'r.failed_count', 'r.difference', 'r.status', 'r.notes', 'r.generated_at', 'u.name as generated_by_name']),
            'activeIntegrationEndpoints' => DB::table('integration_endpoints')->where('active', true)->orderBy('code')->get(['id', 'code', 'name', 'direction', 'transport', 'connector_driver']),
            'integrationSummary' => [
                'activeEndpoints' => DB::table('integration_endpoints')->where('active', true)->count(),
                'alegraReadyEndpoints' => $endpoints->where('connector_driver', 'ALEGRA')->where('runtime_ready', true)->count(),
                'pendingMessages' => DB::table('integration_messages')->whereIn('status', ['PENDING', 'PROCESSING', 'FAILED'])->count(),
                'quarantinedMessages' => DB::table('integration_messages')->where('status', 'QUARANTINED')->count(),
                'successRate' => $resolved > 0 ? round(($acknowledged / $resolved) * 100, 1) : 0,
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function costs(): array
    {
        $p = Parameter::where('scope', 'COST')->pluck('value', 'code');
        $feed = (float) ($p['FEED_COST'] ?? 0) * ((float) ($p['FEED_KG'] ?? 0) / max((float) ($p['TRAY_KG'] ?? 1), 0.0001));
        $premium = (float) ($p['PREMIUM_COST'] ?? 0) * (float) ($p['PREMIUM_RATIO'] ?? 0);
        $labor = (float) ($p['LABOR'] ?? 0);
        $rows = [
            ['operation' => 'Cosecha de huevos', 'material' => 0, 'labor' => $labor / max((float) ($p['RATE_EGG'] ?? 1), 0.0001), 'overhead' => 1.85],
            ['operation' => 'Guardería', 'material' => $premium, 'labor' => $labor / max((float) ($p['RATE_NUR'] ?? 1), 0.0001), 'overhead' => (float) ($p['GIF_NUR'] ?? 0)],
            ['operation' => 'Transferencia', 'material' => $feed, 'labor' => $labor / max((float) ($p['RATE_TRA'] ?? 1), 0.0001), 'overhead' => 2.65],
            ['operation' => 'Engorda', 'material' => $feed, 'labor' => $labor / max((float) ($p['RATE_REA'] ?? 1), 0.0001), 'overhead' => 4.12],
            ['operation' => 'Tamizado / Cosecha', 'material' => 0, 'labor' => $labor / 35, 'overhead' => 3.45],
        ];
        $accumulated = 0;
        foreach ($rows as &$row) {
            $row['total'] = $row['material'] + $row['labor'] + $row['overhead'];
            $row['accumulated'] = $accumulated += $row['total'];
        }

        return [
            'costs' => $rows,
            'summary' => ['material' => array_sum(array_column($rows, 'material')), 'labor' => array_sum(array_column($rows, 'labor')), 'overhead' => array_sum(array_column($rows, 'overhead')), 'total' => $accumulated],
            'costOrders' => DB::table('production_orders as o')
                ->join('parts as p', 'p.id', '=', 'o.part_id')
                ->leftJoin('production_lot_costs as c', 'c.production_order_id', '=', 'o.id')
                ->whereNotIn('o.status', ['PLANNED', 'CANCELLED'])
                ->orderByRaw("CASE WHEN c.status = 'DRAFT' THEN 1 WHEN c.status IS NULL THEN 2 ELSE 3 END")
                ->orderByDesc('o.created_at')
                ->get(['o.id', 'o.number', 'o.status as order_status', 'o.planned_quantity', 'o.completed_quantity', 'o.unit', 'o.started_at', 'o.completed_at', 'p.code as part_code', 'p.description as part_name', 'c.material_cost', 'c.labor_cost', 'c.energy_cost', 'c.overhead_cost', 'c.coproduct_credit', 'c.net_cost', 'c.output_quantity', 'c.unit_cost', 'c.status as cost_status', 'c.calculated_at', 'c.closed_at']),
            'costEntries' => DB::table('production_cost_entries as e')
                ->join('production_orders as o', 'o.id', '=', 'e.production_order_id')
                ->leftJoin('users as u', 'u.id', '=', 'e.recorded_by')
                ->orderByDesc('e.occurred_at')->limit(300)
                ->get(['e.id', 'e.production_order_id', 'o.number as order_number', 'e.category', 'e.source_type', 'e.quantity', 'e.unit', 'e.unit_cost', 'e.amount', 'e.description', 'e.occurred_at', 'u.name as recorded_by']),
            'costRates' => DB::table('cost_rates as r')->leftJoin('parts as p', 'p.id', '=', 'r.part_id')->leftJoin('work_centers as w', 'w.id', '=', 'r.work_center_id')->where('r.active', true)->orderBy('r.category')->orderBy('r.code')->get(['r.id', 'r.code', 'r.name', 'r.category', 'r.unit_cost', 'r.unit', 'r.effective_from', 'r.effective_to', 'p.code as part_code', 'w.code as work_center']),
            'costParts' => Part::query()->where('active', true)->orderBy('code')->get(['id', 'code', 'description', 'unit', 'type']),
            'costWorkCenters' => WorkCenter::query()->where('active', true)->orderBy('code')->get(['id', 'code', 'description']),
            'actualCostSummary' => [
                'openLots' => DB::table('production_lot_costs')->where('status', 'DRAFT')->count(),
                'closedLots' => DB::table('production_lot_costs')->where('status', 'CLOSED')->count(),
                'netCost' => round((float) DB::table('production_lot_costs')->sum('net_cost'), 2),
                'averageUnitCost' => round((float) DB::table('production_lot_costs')->where('output_quantity', '>', 0)->avg('unit_cost'), 4),
            ],
        ];
    }
}
