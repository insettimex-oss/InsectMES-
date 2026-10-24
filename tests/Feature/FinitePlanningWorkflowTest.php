<?php

namespace Tests\Feature;

use App\Models\ProductionOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FinitePlanningWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_finite_plan_respects_priority_precedence_and_shift_capacity(): void
    {
        $this->seed(DatabaseSeeder::class);
        $planner = User::query()->where('email', 'planeacion@insetti.com')->firstOrFail();
        $planner->update(['must_change_password' => false]);
        $this->actingAs($planner);
        ProductionOrder::query()->delete();
        $partId = (int) DB::table('parts')->where('code', 'BSF005')->value('id');

        foreach ([['LOW', 'Orden baja'], ['CRITICAL', 'Orden crítica']] as [$priority, $notes]) {
            $this->post('/mes/orders', [
                'part_id' => $partId,
                'planned_quantity' => 100,
                'priority' => $priority,
                'scheduled_start' => now()->startOfDay()->toDateTimeString(),
                'scheduled_end' => now()->addDay()->toDateTimeString(),
                'notes' => $notes,
            ])->assertRedirect();
        }

        $this->post('/mes/planning/run', [
            'horizon_start' => now()->startOfDay()->toDateTimeString(),
            'horizon_end' => now()->addDays(60)->endOfDay()->toDateTimeString(),
            'notes' => 'Prueba finita de prioridades y precedencia.',
        ])->assertRedirect();

        $run = DB::table('planning_runs')->where('status', 'CURRENT')->first();
        $this->assertNotNull($run);
        $runData = get_object_vars($run);
        $this->assertSame(10, (int) $runData['operations_scheduled']);
        $this->assertSame(0, (int) $runData['unscheduled_operations']);
        $this->assertSame(2, (int) $runData['late_orders']);

        $firstSegment = DB::table('production_schedule_segments as s')
            ->join('production_order_operations as po', 'po.id', '=', 's.production_order_operation_id')
            ->join('production_orders as p', 'p.id', '=', 'po.production_order_id')
            ->where('s.planning_run_id', (int) $runData['id'])
            ->orderBy('s.planned_start')->orderBy('s.id')
            ->first(['p.priority']);
        $this->assertSame('CRITICAL', get_object_vars($firstSegment)['priority']);

        $criticalId = (int) ProductionOrder::query()->where('priority', 'CRITICAL')->value('id');
        $operations = DB::table('production_order_operations')->where('production_order_id', $criticalId)->orderBy('sequence')->get();
        $previousEnd = null;
        foreach ($operations as $operation) {
            $data = get_object_vars($operation);
            $this->assertSame('SCHEDULED', $data['schedule_status']);
            if ($previousEnd !== null) {
                $this->assertGreaterThanOrEqual(strtotime($previousEnd), strtotime((string) $data['planned_start']));
            }
            $previousEnd = (string) $data['planned_end'];
        }

        $previousByCenter = [];
        $segments = DB::table('production_schedule_segments')->where('planning_run_id', (int) $runData['id'])->orderBy('work_center_id')->orderBy('planned_start')->get();
        foreach ($segments as $segment) {
            $data = get_object_vars($segment);
            $center = (int) $data['work_center_id'];
            if (isset($previousByCenter[$center])) {
                $this->assertGreaterThanOrEqual(strtotime($previousByCenter[$center]), strtotime((string) $data['planned_start']));
            }
            $previousByCenter[$center] = (string) $data['planned_end'];
        }
        $this->assertDatabaseHas('audit_events', ['event' => 'FINITE_PLANNING_COMPLETED']);
    }

    public function test_read_only_user_cannot_change_capacity_or_run_plan(): void
    {
        $this->seed(DatabaseSeeder::class);
        $user = User::query()->where('email', 'direccion@insetti.com')->firstOrFail();
        $user->update(['must_change_password' => false]);
        $this->actingAs($user);

        $this->put('/mes/planning/capacity', [])->assertForbidden();
        $this->post('/mes/planning/run', [])->assertForbidden();
        $this->post('/mes/planning/campaigns', [])->assertForbidden();
        $this->patch('/mes/planning/orders/1/campaign', [])->assertForbidden();
        $this->put('/mes/planning/changeovers', [])->assertForbidden();
        $this->put('/mes/planning/biological-rules', [])->assertForbidden();
        $this->post('/mes/planning/material-supplies', [])->assertForbidden();
    }
}
