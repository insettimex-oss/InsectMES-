<?php

namespace App\Services;

use App\Models\Container;
use App\Models\NurseryBatch;
use App\Models\Operation;
use App\Models\Parameter;
use App\Models\Part;
use App\Models\ProductionOrder;
use App\Models\WorkCenter;
use Illuminate\Support\Facades\DB;

class MesDataService
{
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
            'control' => ['operations' => Operation::with(['workCenter', 'inputPart', 'outputPart'])->where('active', true)->orderBy('sort_order')->get(), 'containers' => Container::with(['part', 'location'])->where('active', true)->where('quarantined', false)->where('quantity_current', '>', 0)->orderBy('serial')->get(), 'orderOperations' => DB::table('production_order_operations as po')->join('production_orders as p', 'p.id', '=', 'po.production_order_id')->join('operations as o', 'o.id', '=', 'po.operation_id')->leftJoin('work_instructions as wi', 'wi.id', '=', 'po.work_instruction_id')->whereIn('p.status', ['RELEASED', 'IN_PROGRESS'])->whereIn('po.status', ['READY', 'IN_PROGRESS'])->orderBy('p.priority')->orderBy('po.sequence')->get(['po.id', 'po.production_order_id', 'po.operation_id', 'po.status', 'po.sequence', 'p.number as order_number', 'p.priority', 'o.code as operation_code', 'o.name as operation_name', 'wi.title as instruction_title', 'wi.steps as instruction_steps'])],
            'nursery' => ['batches' => NurseryBatch::with('container.part')->whereNull('closed_at')->orderBy('level')->get(), 'events' => DB::table('nursery_events as e')->join('nursery_batches as b', 'b.id', '=', 'e.nursery_batch_id')->join('containers as c', 'c.id', '=', 'b.container_id')->leftJoin('users as u', 'u.id', '=', 'e.user_id')->orderByDesc('e.occurred_at')->limit(15)->get(['e.id', 'e.occurred_at', 'c.serial', 'e.action', 'e.notes', 'u.name as operator'])],
            'feeding' => $this->feeding(),
            'inventory' => ['containers' => Container::with(['part', 'location'])->orderByDesc('active')->orderBy('serial')->get(), 'parts' => Part::where('active', true)->orderBy('code')->get(), 'locations' => DB::table('locations')->where('active', true)->orderBy('code')->get()],
            'trace' => ['events' => DB::table('genealogy_events as g')->leftJoin('containers as p', 'p.id', '=', 'g.parent_container_id')->join('containers as c', 'c.id', '=', 'g.child_container_id')->leftJoin('operations as o', 'o.id', '=', 'g.operation_id')->leftJoin('production_orders as po', 'po.id', '=', 'g.production_order_id')->orderByDesc('g.occurred_at')->get(['g.id', 'g.event_group', 'g.occurred_at', 'p.serial as parent', 'c.serial as child', 'o.name as operation', 'po.number as production_order', 'g.action', 'g.quantity', 'g.unit', 'g.reason']), 'containers' => Container::with(['part', 'location'])->where('active', true)->where('quarantined', false)->orderBy('serial')->get()],
            'quality' => $this->quality(),
            'environment' => $this->environment(),
            'biosecurity' => $this->biosecurity(),
            'mass-balance' => ['orders' => ProductionOrder::with(['part', 'massBalance'])->whereNotIn('status', ['CANCELLED'])->orderByDesc('created_at')->get()],
            'performance' => $this->performance(),
            'maintenance' => $this->maintenance(),
            'audit' => ['auditEvents' => DB::table('audit_events as a')->leftJoin('users as u', 'u.id', '=', 'a.user_id')->orderByDesc('a.occurred_at')->limit(250)->get(['a.id', 'a.occurred_at', 'a.event', 'a.auditable_type', 'a.auditable_id', 'a.reason', 'a.ip_address', 'u.name as user'])],
            'continuity' => ['backupRuns' => DB::table('backup_runs')->orderByDesc('started_at')->limit(30)->get(), 'database' => basename((string) config('database.connections.sqlite.database')), 'schedule' => 'Diario 02:00', 'retention' => '14 días'],
            'governance' => ['documents' => $this->governanceDocuments()],
            'parameters' => ['parameters' => Parameter::orderBy('scope')->orderBy('code')->get()],
            'costs' => $this->costs(),
            'users' => ['users' => DB::table('users')->orderBy('name')->get(['id', 'name', 'email', 'role', 'company', 'email_verified_at', 'created_at'])],
            default => [],
        };
    }

    /** @return array<string, mixed> */
    private function orders(): array
    {
        return [
            'orders' => ProductionOrder::with(['part', 'operations.operation', 'massBalance'])->orderByRaw("CASE priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END")->orderBy('scheduled_start')->get(),
            'parts' => Part::where('active', true)
                ->whereIn('type', ['WIP', 'Producto Terminado'])
                ->whereIn('id', DB::table('process_routes')->select('part_id')->distinct())
                ->orderBy('code')
                ->get(),
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
            ['code' => 'F0-01', 'name' => 'Mapa de procesos BSF', 'file' => '01-process-map-bsf.md', 'status' => 'LISTO PARA APROBACIÓN'],
            ['code' => 'F0-02', 'name' => 'URS - Requisitos de usuario', 'file' => '02-urs.md', 'status' => 'LISTO PARA APROBACIÓN'],
            ['code' => 'F0-03', 'name' => 'Registro de riesgos', 'file' => '03-risk-register.md', 'status' => 'LISTO PARA APROBACIÓN'],
            ['code' => 'F0-04', 'name' => 'Gobierno de datos maestros', 'file' => '04-master-data-governance.md', 'status' => 'LISTO PARA APROBACIÓN'],
            ['code' => 'F0-05', 'name' => 'Métodos de medición', 'file' => '05-measurement-methods.md', 'status' => 'LISTO PARA APROBACIÓN'],
            ['code' => 'F0-06', 'name' => 'Matriz regulatoria', 'file' => '06-regulatory-matrix.md', 'status' => 'VALIDACIÓN LEGAL PENDIENTE'],
            ['code' => 'F0-07', 'name' => 'Definición de lote y trazabilidad', 'file' => '07-lot-and-traceability-definition.md', 'status' => 'LISTO PARA APROBACIÓN'],
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

        return ['costs' => $rows, 'summary' => ['material' => array_sum(array_column($rows, 'material')), 'labor' => array_sum(array_column($rows, 'labor')), 'overhead' => array_sum(array_column($rows, 'overhead')), 'total' => $accumulated]];
    }
}
