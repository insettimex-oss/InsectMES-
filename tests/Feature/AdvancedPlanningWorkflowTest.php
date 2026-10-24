<?php

namespace Tests\Feature;

use App\Models\ProductionOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AdvancedPlanningWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_orders_page_exposes_the_advanced_planning_workspace(): void
    {
        $this->planner();

        $this->get('/mes/orders')->assertOk()->assertInertia(fn ($page) => $page
            ->component('mes/section')
            ->where('section', 'orders')
            ->has('data.planningCampaigns', 2)
            ->has('data.biologicalRules', 5)
            ->has('data.materialSupplyEvents', 1)
            ->has('data.workCenterOptions', 2)
            ->has('data.planningOperations')
            ->has('data.workCenters'));
    }

    public function test_approved_alternate_center_is_selected_and_used_on_the_shop_floor(): void
    {
        $planner = $this->planner();
        ProductionOrder::query()->delete();
        $operationId = (int) DB::table('operations')->where('code', 'DRY')->value('id');
        $primaryCenterId = (int) DB::table('work_centers')->where('code', 'WC-DRY')->value('id');
        $alternateCenterId = (int) DB::table('work_centers')->where('code', 'WC-DRY-02')->value('id');

        $this->put('/mes/planning/work-center-options', [
            'operation_id' => $operationId,
            'work_center_id' => $alternateCenterId,
            'priority' => 20,
            'efficiency_factor' => 2,
            'qualification_status' => 'APPROVED',
            'valid_from' => now()->subDay()->toDateTimeString(),
            'valid_to' => now()->addDays(30)->toDateTimeString(),
            'active' => true,
            'notes' => 'Centro equivalente calificado para esta prueba funcional automatizada.',
        ])->assertRedirect();

        $this->post('/mes/orders', [
            'part_id' => DB::table('parts')->where('code', 'FG-BOX')->value('id'),
            'planned_quantity' => 10,
            'priority' => 'NORMAL',
            'scheduled_start' => now()->startOfDay()->toDateTimeString(),
            'scheduled_end' => now()->addDays(10)->endOfDay()->toDateTimeString(),
            'notes' => 'Orden para selección automática de centro alterno.',
        ])->assertRedirect();
        $order = ProductionOrder::query()->where('notes', 'Orden para selección automática de centro alterno.')->firstOrFail();

        $this->post('/mes/planning/run', [
            'horizon_start' => now()->startOfDay()->toDateTimeString(),
            'horizon_end' => now()->addDays(20)->endOfDay()->toDateTimeString(),
            'notes' => 'Prueba de optimización multi-centro.',
        ])->assertRedirect();

        $orderOperation = DB::table('production_order_operations')
            ->where('production_order_id', $order->id)
            ->where('operation_id', $operationId)
            ->firstOrFail();
        $run = DB::table('planning_runs')->where('status', 'CURRENT')->firstOrFail();
        $this->assertSame($alternateCenterId, (int) $orderOperation->planned_work_center_id);
        $this->assertSame('ALTERNATE_APPROVED', $orderOperation->work_center_selection);
        $this->assertNotSame($primaryCenterId, (int) $orderOperation->planned_work_center_id);
        $this->assertGreaterThanOrEqual(1, (int) $run->alternate_centers_used);
        $this->assertDatabaseHas('production_schedule_segments', [
            'planning_run_id' => $run->id,
            'production_order_operation_id' => $orderOperation->id,
            'work_center_id' => $alternateCenterId,
        ]);
        $this->assertDatabaseHas('audit_events', ['event' => 'ALTERNATE_WORK_CENTER_APPROVED', 'user_id' => $planner->id]);

        DB::table('production_orders')->where('id', $order->id)->update(['status' => 'RELEASED']);
        DB::table('production_order_operations')->where('production_order_id', $order->id)->where('sequence', '<', $orderOperation->sequence)->update(['status' => 'COMPLETED']);
        DB::table('production_order_operations')->where('id', $orderOperation->id)->update(['status' => 'READY']);
        $operator = User::query()->where('email', 'operador@insetti.com')->firstOrFail();
        $operator->update(['must_change_password' => false]);
        $this->actingAs($operator);
        $this->post("/mes/control/operations/{$orderOperation->id}/start")->assertRedirect();
        $this->assertDatabaseHas('production_execution_sessions', [
            'production_order_operation_id' => $orderOperation->id,
            'work_center_id' => $alternateCenterId,
            'status' => 'RUNNING',
        ]);
    }

    public function test_material_requirements_are_limited_to_the_selected_process_route(): void
    {
        $this->planner();
        ProductionOrder::query()->delete();

        foreach ([['BSF005', 'Larva con alimentación'], ['FG-BOX', 'Postproceso sin alimentación']] as [$partCode, $notes]) {
            $this->post('/mes/orders', [
                'part_id' => DB::table('parts')->where('code', $partCode)->value('id'),
                'planned_quantity' => 10,
                'priority' => 'NORMAL',
                'scheduled_start' => now()->addDay()->toDateTimeString(),
                'scheduled_end' => now()->addDays(30)->toDateTimeString(),
                'notes' => $notes,
            ])->assertRedirect();
        }

        $larvaOrder = ProductionOrder::query()->where('notes', 'Larva con alimentación')->firstOrFail();
        $postprocessOrder = ProductionOrder::query()->where('notes', 'Postproceso sin alimentación')->firstOrFail();
        $this->assertSame(4, DB::table('production_order_materials')->where('production_order_id', $larvaOrder->id)->count());
        $this->assertSame(0, DB::table('production_order_materials')->where('production_order_id', $postprocessOrder->id)->count());
    }

    public function test_plan_combines_campaign_changeover_future_materials_and_biological_occupancy(): void
    {
        $planner = $this->planner();
        ProductionOrder::query()->delete();
        DB::table('containers')->where('part_id', DB::table('parts')->where('code', 'F-001')->value('id'))->update(['quantity_current' => 0]);
        $partId = (int) DB::table('parts')->where('code', 'BSF005')->value('id');

        foreach ([['CMP-A', 'Campaña A', 'FAMILIA_A', 10], ['CMP-B', 'Campaña B', 'FAMILIA_B', 20]] as [$code, $name, $family, $priority]) {
            $this->post('/mes/planning/campaigns', [
                'code' => $code,
                'name' => $name,
                'family' => $family,
                'part_id' => $partId,
                'priority' => $priority,
                'planned_start' => now()->startOfDay()->toDateTimeString(),
                'planned_end' => now()->addDays(60)->endOfDay()->toDateTimeString(),
                'notes' => 'Campaña de prueba para planeación avanzada.',
            ])->assertRedirect();
        }
        $campaignA = (int) DB::table('production_campaigns')->where('code', 'CMP-A')->value('id');
        $campaignB = (int) DB::table('production_campaigns')->where('code', 'CMP-B')->value('id');
        $eggCenter = (int) DB::table('work_centers')->where('code', 'WC-EGG')->value('id');
        $this->put('/mes/planning/changeovers', [
            'work_center_id' => $eggCenter,
            'from_family' => 'FAMILIA_A',
            'to_family' => 'FAMILIA_B',
            'setup_minutes' => 30,
            'cleaning_required' => true,
            'active' => true,
            'notes' => 'Limpieza validada entre familias de prueba.',
        ])->assertRedirect();

        $feedPart = (int) DB::table('parts')->where('code', 'F-001')->value('id');
        $availableAt = now()->addDay()->startOfDay()->addHours(6);
        $this->post('/mes/planning/material-supplies', [
            'part_id' => $feedPart,
            'quantity' => 1000,
            'available_at' => $availableAt->toDateTimeString(),
            'status' => 'CONFIRMED',
            'source' => 'Proveedor de prueba',
            'reference' => 'OC-TEST-001',
            'notes' => 'Suministro confirmado para ambas campañas.',
        ])->assertRedirect();

        foreach ([[$campaignA, 'Orden A'], [$campaignB, 'Orden B']] as [$campaignId, $notes]) {
            $this->post('/mes/orders', [
                'part_id' => $partId,
                'campaign_id' => $campaignId,
                'planned_quantity' => 100,
                'priority' => 'NORMAL',
                'scheduled_start' => now()->startOfDay()->toDateTimeString(),
                'scheduled_end' => now()->addDays(30)->endOfDay()->toDateTimeString(),
                'notes' => $notes,
            ])->assertRedirect();
        }

        $this->post('/mes/planning/run', [
            'horizon_start' => now()->startOfDay()->toDateTimeString(),
            'horizon_end' => now()->addDays(60)->endOfDay()->toDateTimeString(),
            'notes' => 'Campañas, materiales y ventanas biológicas.',
        ])->assertRedirect();

        $run = get_object_vars(DB::table('planning_runs')->where('status', 'CURRENT')->firstOrFail());
        $this->assertSame(10, (int) $run['operations_scheduled']);
        $this->assertSame(2, (int) $run['campaigns_scheduled']);
        $this->assertSame(30, (int) $run['changeover_minutes']);
        $this->assertSame(0, (int) $run['material_shortages']);
        $this->assertSame(0, (int) $run['biological_violations']);
        $this->assertSame(4, DB::table('biological_schedule_occupancies')->where('planning_run_id', $run['id'])->count());
        $this->assertDatabaseHas('production_schedule_segments', [
            'planning_run_id' => $run['id'],
            'segment_type' => 'CHANGEOVER',
            'planned_minutes' => 30,
        ]);
        $this->assertSame(2, DB::table('planning_material_allocations')->where('planning_run_id', $run['id'])->where('part_id', $feedPart)->where('source', 'EXPECTED')->count());
        $firstRun = DB::table('production_schedule_segments')->where('planning_run_id', $run['id'])->where('segment_type', 'RUN')->orderBy('planned_start')->first();
        $this->assertNotNull($firstRun);
        $this->assertGreaterThanOrEqual($availableAt->getTimestamp(), strtotime((string) get_object_vars($firstRun)['planned_start']));
        $this->assertDatabaseHas('audit_events', ['event' => 'PLANNING_CAMPAIGN_CREATED', 'user_id' => $planner->id]);
        $this->assertDatabaseHas('audit_events', ['event' => 'MATERIAL_SUPPLY_REGISTERED', 'user_id' => $planner->id]);
    }

    public function test_material_shortage_blocks_the_whole_order_without_consuming_capacity(): void
    {
        $this->planner();
        ProductionOrder::query()->delete();
        DB::table('containers')->update(['quantity_current' => 0]);
        DB::table('material_supply_events')->delete();
        $partId = (int) DB::table('parts')->where('code', 'BSF005')->value('id');
        $this->post('/mes/orders', [
            'part_id' => $partId,
            'planned_quantity' => 100,
            'priority' => 'HIGH',
            'scheduled_start' => now()->startOfDay()->toDateTimeString(),
            'scheduled_end' => now()->addDays(30)->toDateTimeString(),
            'notes' => 'Orden deliberadamente sin materiales.',
        ])->assertRedirect();

        $this->post('/mes/planning/run', [
            'horizon_start' => now()->startOfDay()->toDateTimeString(),
            'horizon_end' => now()->addDays(60)->toDateTimeString(),
            'notes' => 'Prueba de faltante.',
        ])->assertRedirect();

        $run = get_object_vars(DB::table('planning_runs')->where('status', 'CURRENT')->firstOrFail());
        $this->assertSame(1, (int) $run['material_shortages']);
        $this->assertSame(0, (int) $run['operations_scheduled']);
        $this->assertSame(5, (int) $run['unscheduled_operations']);
        $this->assertSame(0, DB::table('production_schedule_segments')->where('planning_run_id', $run['id'])->count());
        $this->assertSame(5, DB::table('production_order_operations')->where('schedule_reason', 'MATERIAL_SHORTAGE')->count());
    }

    public function test_biological_window_violation_is_visible_and_audited(): void
    {
        $planner = $this->planner();
        ProductionOrder::query()->delete();
        $partId = (int) DB::table('parts')->where('code', 'BSF005')->value('id');
        $transfer = (int) DB::table('operations')->where('code', 'TRA')->value('id');
        $this->put('/mes/planning/biological-rules', [
            'part_id' => $partId,
            'operation_id' => $transfer,
            'minimum_age_hours' => 0,
            'target_age_hours' => 0.5,
            'maximum_age_hours' => 1,
            'active' => true,
            'rationale' => 'Ventana deliberadamente cerrada para probar el bloqueo.',
        ])->assertRedirect();
        $this->post('/mes/orders', [
            'part_id' => $partId,
            'planned_quantity' => 10,
            'priority' => 'NORMAL',
            'scheduled_start' => now()->startOfDay()->toDateTimeString(),
            'scheduled_end' => now()->addDays(30)->toDateTimeString(),
            'notes' => 'Orden para verificar ventana biológica.',
        ])->assertRedirect();
        $this->post('/mes/planning/run', [
            'horizon_start' => now()->startOfDay()->toDateTimeString(),
            'horizon_end' => now()->addDays(60)->toDateTimeString(),
            'notes' => 'Prueba de ventana biológica.',
        ])->assertRedirect();

        $run = get_object_vars(DB::table('planning_runs')->where('status', 'CURRENT')->firstOrFail());
        $this->assertSame(1, (int) $run['biological_violations']);
        $this->assertSame(5, (int) $run['unscheduled_operations']);
        $this->assertSame(5, DB::table('production_order_operations')->where('schedule_reason', 'BIOLOGICAL_WINDOW')->count());
        $this->assertDatabaseHas('audit_events', ['event' => 'BIOLOGICAL_WINDOW_APPROVED', 'user_id' => $planner->id]);
    }

    private function planner(): User
    {
        $this->seed(DatabaseSeeder::class);
        $planner = User::query()->where('email', 'planeacion@insetti.com')->firstOrFail();
        $planner->update(['must_change_password' => false]);
        $this->actingAs($planner);

        return $planner;
    }
}
