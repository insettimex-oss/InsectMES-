<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\Location;
use App\Models\Operation;
use App\Models\Part;
use App\Models\ProductionOrder;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ActualCostWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAs(User::query()->where('email', 'admin@insetti.com')->firstOrFail());
    }

    public function test_actual_lot_cost_combines_feeding_labor_energy_and_coproduct_credit(): void
    {
        $user = User::query()->where('email', 'admin@insetti.com')->firstOrFail();
        $finishedPart = Part::query()->where('code', 'FG-MEAL')->firstOrFail();
        $feedPart = Part::query()->where('code', 'F-001')->firstOrFail();
        $operation = Operation::query()->whereNotNull('work_center_id')->firstOrFail();
        $location = Location::query()->where('code', 'ALM-MP')->firstOrFail();
        $target = Container::query()->where('serial', 'BSF000106')->firstOrFail();
        $feed = Container::query()->create(['serial' => 'COST-FEED-01', 'part_id' => $feedPart->id, 'location_id' => $location->id, 'status' => 'OK', 'origin' => 'RECEIPT', 'quantity_current' => 100, 'unit' => 'kg', 'active' => true, 'quarantined' => false]);
        $order = ProductionOrder::query()->create(['number' => 'PO-COST-001', 'part_id' => $finishedPart->id, 'work_center_id' => $operation->work_center_id, 'status' => 'COMPLETED', 'priority' => 'NORMAL', 'planned_quantity' => 10, 'completed_quantity' => 10, 'unit' => 'kg', 'scheduled_start' => now()->subDay(), 'scheduled_end' => now(), 'started_at' => now()->subHours(3), 'completed_at' => now(), 'created_by' => $user->id]);
        DB::table('production_order_operations')->insert(['production_order_id' => $order->id, 'operation_id' => $operation->id, 'sequence' => 1, 'status' => 'COMPLETED', 'planned_quantity' => 10, 'actual_output' => 10, 'active_minutes' => 120, 'operator_id' => $user->id, 'started_at' => now()->subHours(2), 'completed_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('feeding_events')->insert(['production_order_id' => $order->id, 'target_container_id' => $target->id, 'substrate_container_id' => $feed->id, 'quantity' => 4, 'unit' => 'kg', 'recorded_by' => $user->id, 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);

        foreach ([
            ['MAT-FEED', 'Alimento real', 'MATERIAL', $feedPart->id, null, 3.5, 'kg'],
            ['LAB-GEN', 'Mano de obra real', 'LABOR', null, null, 70, 'h'],
            ['ENE-KWH', 'Energía eléctrica', 'ENERGY', null, null, 2.5, 'kWh'],
            ['COP-FRASS', 'Crédito de frass', 'COPRODUCT_CREDIT', null, null, 1, 'kg'],
        ] as [$code, $name, $category, $partId, $workCenterId, $unitCost, $unit]) {
            $this->post('/mes/costs/rates', ['code' => $code, 'name' => $name, 'category' => $category, 'part_id' => $partId, 'work_center_id' => $workCenterId, 'unit_cost' => $unitCost, 'unit' => $unit, 'effective_from' => today()->toDateString()])->assertRedirect();
        }

        $energyRate = DB::table('cost_rates')->where('code', 'ENE-KWH')->value('id');
        $creditRate = DB::table('cost_rates')->where('code', 'COP-FRASS')->value('id');
        $this->post('/mes/costs/entries', ['production_order_id' => $order->id, 'cost_rate_id' => $energyRate, 'quantity' => 10, 'description' => 'Lectura de medidor de secado', 'occurred_at' => now()->toDateTimeString()])->assertRedirect();
        $this->post('/mes/costs/entries', ['production_order_id' => $order->id, 'cost_rate_id' => $creditRate, 'quantity' => 5, 'description' => 'Frass recuperado del lote', 'occurred_at' => now()->toDateTimeString()])->assertRedirect();

        $this->post("/mes/costs/orders/{$order->id}/calculate")->assertRedirect();

        $this->assertDatabaseHas('production_lot_costs', ['production_order_id' => $order->id, 'material_cost' => 14, 'labor_cost' => 140, 'energy_cost' => 25, 'coproduct_credit' => 5, 'net_cost' => 174, 'unit_cost' => 17.4, 'status' => 'DRAFT']);
        $this->assertDatabaseHas('production_cost_entries', ['production_order_id' => $order->id, 'source_type' => 'FEEDING_AUTO', 'amount' => 14]);
        $this->assertDatabaseHas('production_cost_entries', ['production_order_id' => $order->id, 'source_type' => 'LABOR_AUTO', 'amount' => 140]);

        $this->patch("/mes/costs/orders/{$order->id}/close", ['closure_notes' => 'Consumos, tiempo, energía y coproducto conciliados contra evidencia de turno.'])->assertRedirect();
        $this->assertDatabaseHas('production_lot_costs', ['production_order_id' => $order->id, 'status' => 'CLOSED']);
        $this->post('/mes/costs/entries', ['production_order_id' => $order->id, 'cost_rate_id' => $energyRate, 'quantity' => 1, 'description' => 'Intento posterior', 'occurred_at' => now()->toDateTimeString()])->assertStatus(422);
        $this->assertDatabaseHas('audit_events', ['event' => 'LOT_COST_CLOSED']);
    }

    public function test_planner_can_record_costs_but_only_management_can_approve_them(): void
    {
        $planner = User::query()->where('email', 'planeacion@insetti.com')->firstOrFail();
        $planner->update(['must_change_password' => false]);
        $management = User::query()->where('email', 'direccion@insetti.com')->firstOrFail();
        $management->update(['must_change_password' => false]);

        $this->actingAs($planner)->post('/mes/costs/rates', [])->assertSessionHasErrors();
        $this->patch('/mes/costs/orders/1/close', [])->assertForbidden();
        $this->actingAs($management)->post('/mes/costs/rates', [])->assertForbidden();
        $this->patch('/mes/costs/orders/1/close', [])->assertSessionHasErrors();
    }
}
