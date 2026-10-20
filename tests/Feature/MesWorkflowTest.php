<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\Location;
use App\Models\NurseryBatch;
use App\Models\Operation;
use App\Models\Part;
use App\Models\ProductionOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class MesWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAs(User::where('email', 'admin@insetti.com')->firstOrFail());
    }

    public function test_mes_sections_are_available_to_authenticated_users(): void
    {
        foreach (['parts', 'routing', 'orders', 'control', 'nursery', 'feeding', 'inventory', 'trace', 'quality', 'environment', 'biosecurity', 'mass-balance', 'performance', 'maintenance', 'audit', 'continuity', 'governance', 'parameters', 'costs'] as $section) {
            $this->get("/mes/{$section}")->assertOk();
        }
    }

    public function test_receipt_creates_serialized_inventory_and_movements(): void
    {
        $before = Container::count();
        $this->post('/mes/inventory/receive', [
            'part_id' => Part::where('code', 'MP-003')->value('id'),
            'location_id' => Location::where('code', 'ALM-MP')->value('id'),
            'quantity' => 2500,
            'containers' => 2,
            'supplier_lot' => 'TEST-LOT',
        ])->assertRedirect();

        $this->assertSame($before + 2, Container::count());
        $this->assertDatabaseCount('inventory_movements', 2);
        $this->assertDatabaseHas('containers', ['supplier_lot' => 'TEST-LOT', 'quantity_current' => 2500]);
    }

    public function test_production_consumes_input_and_creates_output_with_genealogy(): void
    {
        $input = Container::where('serial', 'BSF000105')->firstOrFail();
        $operation = Operation::where('code', 'NUR')->firstOrFail();

        $this->post('/mes/production', [
            'operation_id' => $operation->id,
            'input_container_id' => $input->id,
            'quantity_in' => 10,
            'quantity_out' => 970,
            'notes' => 'Prueba de integración',
        ])->assertRedirect();

        $this->assertSame(110.0, (float) $input->fresh()->quantity_current);
        $this->assertDatabaseHas('genealogy_events', ['parent_container_id' => $input->id, 'operation_id' => $operation->id]);
        $this->assertDatabaseHas('production_runs', ['operation_id' => $operation->id, 'quantity_out' => 970]);
    }

    public function test_nursery_batch_advances_one_level_and_moves_container(): void
    {
        $batch = NurseryBatch::firstOrFail();
        $this->patch("/mes/nursery/{$batch->id}/advance")->assertRedirect();

        $this->assertSame(3, $batch->fresh()->level);
        $this->assertSame('RACK-01-N3', $batch->container->fresh()->location->code);
        $this->assertDatabaseHas('nursery_events', ['nursery_batch_id' => $batch->id, 'action' => 'Movimiento a N3']);
    }

    public function test_order_is_created_with_route_and_can_be_released(): void
    {
        $this->post('/mes/orders', [
            'part_id' => Part::where('code', 'BSF005')->value('id'), 'planned_quantity' => 100,
            'priority' => 'HIGH', 'scheduled_start' => now()->addDay()->toDateTimeString(),
            'scheduled_end' => now()->addDays(2)->toDateTimeString(), 'notes' => 'Plan semanal',
        ])->assertRedirect();

        $order = ProductionOrder::latest('id')->firstOrFail();
        $this->assertGreaterThan(0, $order->operations()->count());
        $this->patch("/mes/orders/{$order->id}/status", ['status' => 'RELEASED', 'reason' => 'Material y capacidad confirmados'])->assertRedirect();
        $this->assertSame('RELEASED', $order->fresh()->status);
        $this->assertDatabaseHas('production_order_operations', ['production_order_id' => $order->id, 'status' => 'READY']);
        $this->assertDatabaseHas('audit_events', ['event' => 'ORDER_STATUS_CHANGED', 'auditable_id' => (string) $order->id]);
    }

    public function test_order_form_only_offers_parts_with_an_approved_route(): void
    {
        $response = $this->get('/mes/orders')->assertOk();

        $response->assertInertia(fn ($page) => $page
            ->where('data.parts', fn ($parts) => collect($parts)->isNotEmpty()
                && collect($parts)->every(fn ($part) => DB::table('process_routes')->where('part_id', $part['id'])->exists()))
        );
    }

    public function test_order_without_an_approved_route_returns_a_form_error(): void
    {
        $part = Part::where('code', 'FG001')->firstOrFail();
        $before = ProductionOrder::count();

        $this->from('/mes/orders')->post('/mes/orders', [
            'part_id' => $part->id,
            'planned_quantity' => 100,
            'priority' => 'NORMAL',
            'scheduled_start' => now()->addDay()->toDateTimeString(),
        ])->assertRedirect('/mes/orders')->assertSessionHasErrors('part_id');

        $this->assertSame($before, ProductionOrder::count());
    }

    public function test_container_can_be_split_and_merged_with_grouped_genealogy(): void
    {
        $source = Container::where('serial', 'BSF000104')->firstOrFail();
        $this->post("/mes/trace/{$source->id}/split", ['pieces' => 2, 'quantity_each' => 10, 'reason' => 'Distribución entre larveros'])->assertRedirect();
        $children = Container::where('origin', 'SPLIT')->get();
        $this->assertCount(2, $children);
        $this->assertSame(1, DB::table('genealogy_events')->where('action', 'SPLIT')->distinct('event_group')->count('event_group'));

        $this->post('/mes/trace/merge', ['container_ids' => $children->pluck('id')->all(), 'reason' => 'Consolidación para siguiente operación'])->assertRedirect();
        $this->assertDatabaseHas('containers', ['origin' => 'MERGE', 'quantity_current' => 20]);
        $this->assertSame(2, DB::table('genealogy_events')->where('action', 'MERGE')->count());
    }

    public function test_quality_failure_quarantines_the_container(): void
    {
        $container = Container::where('serial', 'BSF000104')->firstOrFail();
        $spec = DB::table('quality_specifications')->where('code', 'SUB-MOIST')->first();
        $this->post('/mes/quality/inspections', [
            'quality_specification_id' => $spec->id, 'container_id' => $container->id,
            'result_value' => 90, 'notes' => 'Fuera de rango',
        ])->assertRedirect();
        $this->assertTrue($container->fresh()->quarantined);
        $this->assertDatabaseHas('quality_inspections', ['container_id' => $container->id, 'status' => 'FAIL', 'disposition' => 'HOLD']);
    }

    public function test_environment_alarm_biosecurity_and_mass_balance_are_controlled(): void
    {
        $limit = DB::table('environmental_limits')->first();
        $location = Location::where('code', 'WC-NUR')->firstOrFail();
        $this->post('/mes/environment/readings', ['environmental_limit_id' => $limit->id, 'location_id' => $location->id, 'value' => 999, 'source' => 'MANUAL', 'evidence' => 'Lectura de prueba'])->assertRedirect();
        $this->assertDatabaseHas('environmental_readings', ['alarm_status' => 'OPEN', 'within_limits' => false]);

        $this->post('/mes/biosecurity/events', ['type' => 'MORTALITY', 'location_id' => $location->id, 'severity' => 'HIGH', 'observation' => 'Mortalidad superior al patrón', 'immediate_action' => 'Aislar larvero'])->assertRedirect();
        $this->assertDatabaseHas('biosecurity_events', ['type' => 'MORTALITY', 'status' => 'OPEN']);

        $this->post('/mes/orders', ['part_id' => Part::where('code', 'BSF005')->value('id'), 'planned_quantity' => 100, 'priority' => 'NORMAL', 'scheduled_start' => now()->toDateTimeString()]);
        $order = ProductionOrder::latest('id')->firstOrFail();
        $this->post("/mes/mass-balance/{$order->id}", ['substrate_input' => 100, 'water_input' => 50, 'biomass_input' => 5, 'larvae_output' => 40, 'frass_output' => 60, 'coproduct_output' => 0, 'evaporation' => 50, 'waste' => 5, 'tolerance_percent' => 5])->assertRedirect();
        $this->assertDatabaseHas('mass_balances', ['production_order_id' => $order->id, 'status' => 'BALANCED']);
    }

    public function test_feeding_consumes_a_traced_substrate_lot(): void
    {
        $target = Container::where('serial', 'BSF000106')->firstOrFail();
        $substrate = Container::where('serial', 'BSF000104')->firstOrFail();
        $before = (float) $substrate->quantity_current;

        $this->post('/mes/feeding', [
            'target_container_id' => $target->id,
            'substrate_container_id' => $substrate->id,
            'quantity' => 12.5,
            'dry_matter_percent' => 36,
            'notes' => 'Ración de prueba por larvero',
        ])->assertRedirect();

        $this->assertSame($before - 12.5, (float) $substrate->fresh()->quantity_current);
        $this->assertDatabaseHas('feeding_events', ['target_container_id' => $target->id, 'substrate_container_id' => $substrate->id, 'quantity' => 12.5]);
        $this->assertDatabaseHas('inventory_movements', ['container_id' => $substrate->id, 'type' => 'FEEDING']);
    }

    public function test_quality_deviation_creates_capa_and_can_be_closed(): void
    {
        $container = Container::where('serial', 'BSF000106')->firstOrFail();
        $this->post('/mes/quality/deviations', [
            'container_id' => $container->id,
            'source' => 'PROCESS',
            'severity' => 'HIGH',
            'title' => 'Crecimiento fuera de patrón',
            'description' => 'El peso promedio quedó debajo del límite operativo.',
            'immediate_action' => 'Aislar el larvero.',
            'corrective_action' => 'Ajustar la ración y verificar en veinticuatro horas.',
            'preventive_action' => 'Revisar el método de dosificación por turno.',
            'due_at' => today()->addDays(3)->toDateString(),
        ])->assertRedirect();

        $deviation = DB::table('quality_deviations')->latest('id')->first();
        $this->assertTrue($container->fresh()->quarantined);
        $this->assertDatabaseCount('corrective_actions', 2);

        $this->patch("/mes/quality/deviations/{$deviation->id}/close", [
            'root_cause' => 'Variación del dosificador de sustrato.',
            'disposition' => 'Larvero liberado después de recuperar el patrón.',
            'effectiveness_result' => 'Peso verificado dentro del límite durante dos mediciones.',
        ])->assertRedirect();

        $this->assertDatabaseHas('quality_deviations', ['id' => $deviation->id, 'status' => 'CLOSED']);
        $this->assertFalse($container->fresh()->quarantined);
    }

    public function test_maintenance_order_blocks_and_releases_an_asset(): void
    {
        $asset = DB::table('assets')->where('code', 'EQ-REA-01')->first();
        $this->post('/mes/maintenance/work-orders', [
            'asset_id' => $asset->id,
            'type' => 'CORRECTIVE',
            'priority' => 'CRITICAL',
            'description' => 'Atender falla del sistema de dosificación.',
            'scheduled_at' => now()->toDateTimeString(),
        ])->assertRedirect();
        $order = DB::table('maintenance_work_orders')->latest('id')->first();
        $this->assertDatabaseHas('assets', ['id' => $asset->id, 'status' => 'BLOCKED']);

        $this->patch("/mes/maintenance/work-orders/{$order->id}/complete", [
            'result' => 'Sensor sustituido y prueba funcional aprobada.',
            'downtime_minutes' => 42,
            'next_due_at' => today()->addMonth()->toDateString(),
        ])->assertRedirect();

        $this->assertDatabaseHas('maintenance_work_orders', ['id' => $order->id, 'status' => 'COMPLETED', 'downtime_minutes' => 42]);
        $this->assertDatabaseHas('assets', ['id' => $asset->id, 'status' => 'AVAILABLE']);
    }

    public function test_process_routes_are_separated_by_business_output(): void
    {
        $routes = fn (string $part): array => DB::table('process_routes as r')
            ->join('parts as p', 'p.id', '=', 'r.part_id')
            ->join('operations as o', 'o.id', '=', 'r.operation_id')
            ->where('p.code', $part)->orderBy('r.sequence')->pluck('o.code')->all();

        $this->assertSame(['EGG', 'NUR', 'TRA', 'REA', 'HAR'], $routes('BSF005'));
        $this->assertSame(['WAS', 'SAN', 'DRY', 'FRA', 'GRI', 'PAC', 'BOX', 'SHP'], $routes('FG-BOX'));
        $this->assertSame(['PUP', 'DAR', 'LOV'], $routes('BSF002'));
    }

    public function test_downtime_and_oee_are_recorded_for_a_shift(): void
    {
        $center = DB::table('work_centers')->where('code', 'WC-REA')->first();
        $reason = DB::table('downtime_reasons')->where('code', 'FAILURE')->first();
        $shift = DB::table('shifts')->where('code', 'T1')->first();

        $this->post('/mes/performance/downtimes', [
            'work_center_id' => $center->id,
            'downtime_reason_id' => $reason->id,
            'started_at' => now()->subMinutes(20)->toDateTimeString(),
            'notes' => 'Atasco de dosificador.',
        ])->assertRedirect();
        $downtime = DB::table('downtime_events')->latest('id')->first();
        $this->assertDatabaseHas('work_centers', ['id' => $center->id, 'status' => 'DOWNTIME']);

        $this->patch("/mes/performance/downtimes/{$downtime->id}/close", [
            'ended_at' => now()->toDateTimeString(),
            'notes' => 'Limpieza y prueba funcional.',
        ])->assertRedirect();
        $this->assertDatabaseHas('downtime_events', ['id' => $downtime->id, 'status' => 'CLOSED', 'duration_minutes' => 20]);

        $this->post('/mes/performance/oee', [
            'production_date' => today()->toDateString(),
            'shift_id' => $shift->id,
            'work_center_id' => $center->id,
            'planned_minutes' => 480,
            'downtime_minutes' => 60,
            'ideal_cycle_minutes' => 1,
            'total_count' => 300,
            'good_count' => 290,
        ])->assertRedirect();
        $snapshot = DB::table('oee_snapshots')->first();
        $this->assertEqualsWithDelta(87.5, (float) $snapshot->availability, 0.001);
        $this->assertEqualsWithDelta(60.417, (float) $snapshot->oee, 0.001);
    }

    public function test_coa_and_retention_sample_complete_quality_release(): void
    {
        $container = Container::where('serial', 'BSF000106')->firstOrFail();
        $specification = DB::table('quality_specifications')->where('code', 'LAR-MOIST')->first();
        $this->post('/mes/quality/inspections', [
            'quality_specification_id' => $specification->id,
            'container_id' => $container->id,
            'result_value' => 65,
            'notes' => 'Resultado conforme para liberación.',
        ])->assertRedirect();

        $this->post('/mes/quality/certificates', [
            'container_id' => $container->id,
            'notes' => 'COA de prueba.',
        ])->assertRedirect();
        $certificate = DB::table('certificates_of_analysis')->first();
        $this->assertDatabaseCount('certificate_results', 1);
        $this->patch("/mes/quality/certificates/{$certificate->id}/approve")->assertRedirect();
        $this->assertDatabaseHas('certificates_of_analysis', ['id' => $certificate->id, 'status' => 'APPROVED']);

        $this->post('/mes/quality/retention-samples', [
            'container_id' => $container->id,
            'quantity' => 250,
            'unit' => 'g',
            'storage_location' => 'RET-A1',
            'retained_at' => today()->toDateString(),
            'expires_at' => today()->addYear()->toDateString(),
        ])->assertRedirect();
        $this->assertDatabaseHas('retention_samples', ['container_id' => $container->id, 'status' => 'AVAILABLE']);
    }

    public function test_spare_part_consumption_is_linked_to_maintenance(): void
    {
        $asset = DB::table('assets')->where('code', 'EQ-REA-01')->first();
        $this->post('/mes/maintenance/work-orders', [
            'asset_id' => $asset->id,
            'type' => 'CORRECTIVE',
            'priority' => 'HIGH',
            'description' => 'Sustituir componente con desgaste.',
        ])->assertRedirect();
        $order = DB::table('maintenance_work_orders')->latest('id')->first();
        $spare = DB::table('spare_parts')->where('code', 'REP-MOT-01')->first();

        $this->post('/mes/maintenance/spare-parts/consume', [
            'maintenance_work_order_id' => $order->id,
            'spare_part_id' => $spare->id,
            'quantity' => 1,
        ])->assertRedirect();

        $this->assertDatabaseHas('spare_parts', ['id' => $spare->id, 'quantity_on_hand' => 1]);
        $this->assertDatabaseHas('maintenance_spare_part_usages', ['maintenance_work_order_id' => $order->id, 'spare_part_id' => $spare->id, 'quantity' => 1]);
    }
}
