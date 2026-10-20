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
            'inventory' => ['containers' => Container::with(['part', 'location'])->orderByDesc('active')->orderBy('serial')->get(), 'parts' => Part::where('active', true)->orderBy('code')->get(), 'locations' => DB::table('locations')->where('active', true)->orderBy('code')->get()],
            'trace' => ['events' => DB::table('genealogy_events as g')->leftJoin('containers as p', 'p.id', '=', 'g.parent_container_id')->join('containers as c', 'c.id', '=', 'g.child_container_id')->leftJoin('operations as o', 'o.id', '=', 'g.operation_id')->leftJoin('production_orders as po', 'po.id', '=', 'g.production_order_id')->orderByDesc('g.occurred_at')->get(['g.id', 'g.event_group', 'g.occurred_at', 'p.serial as parent', 'c.serial as child', 'o.name as operation', 'po.number as production_order', 'g.action', 'g.quantity', 'g.unit', 'g.reason']), 'containers' => Container::with(['part', 'location'])->where('active', true)->where('quarantined', false)->orderBy('serial')->get()],
            'quality' => $this->quality(),
            'environment' => $this->environment(),
            'biosecurity' => $this->biosecurity(),
            'mass-balance' => ['orders' => ProductionOrder::with(['part', 'massBalance'])->whereNotIn('status', ['CANCELLED'])->orderByDesc('created_at')->get()],
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
            'parts' => Part::where('active', true)->whereIn('type', ['WIP', 'Producto Terminado'])->orderBy('code')->get(),
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
