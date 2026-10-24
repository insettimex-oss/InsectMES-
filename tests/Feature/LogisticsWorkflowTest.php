<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\Location;
use App\Models\Part;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class LogisticsWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->actingAs(User::query()->where('email', 'admin@insetti.com')->firstOrFail());
    }

    public function test_order_is_allocated_by_fefo_picked_and_shipped_to_a_customer(): void
    {
        $part = Part::query()->where('code', 'FG-MEAL')->firstOrFail();
        $location = Location::query()->where('code', 'ALM-PT')->firstOrFail();
        $early = Container::query()->create(['serial' => 'FEFO-EARLY', 'lot_code' => 'LOT-FEFO-1', 'part_id' => $part->id, 'location_id' => $location->id, 'status' => 'OK', 'origin' => 'PRODUCTION', 'quantity_current' => 10, 'unit' => $part->unit, 'active' => true, 'quarantined' => false, 'expires_at' => now()->addDays(10)->toDateString()]);
        $late = Container::query()->create(['serial' => 'FEFO-LATE', 'lot_code' => 'LOT-FEFO-2', 'part_id' => $part->id, 'location_id' => $location->id, 'status' => 'OK', 'origin' => 'PRODUCTION', 'quantity_current' => 10, 'unit' => $part->unit, 'active' => true, 'quarantined' => false, 'expires_at' => now()->addDays(30)->toDateString()]);

        $this->post('/mes/logistics/customers', ['code' => 'CUS-TEST', 'name' => 'Cliente de trazabilidad', 'customer_type' => 'INDUSTRIAL'])->assertRedirect();
        $customerId = DB::table('customers')->where('code', 'CUS-TEST')->value('id');
        $this->post('/mes/logistics/orders', ['customer_id' => $customerId, 'part_id' => $part->id, 'quantity' => 6, 'priority' => 'HIGH', 'requested_at' => now()->toDateString(), 'promised_at' => now()->addDay()->toDateString()])->assertRedirect();
        $orderId = DB::table('sales_orders')->latest('id')->value('id');

        $this->patch("/mes/logistics/orders/{$orderId}/allocate")->assertRedirect();
        $allocation = DB::table('shipment_allocations')->first();
        $this->assertSame($early->id, $allocation->container_id);
        $this->assertSame(6.0, (float) $allocation->quantity);
        $this->assertDatabaseMissing('shipment_allocations', ['container_id' => $late->id]);

        $this->patch("/mes/logistics/allocations/{$allocation->id}/pick")->assertRedirect();
        $this->post("/mes/logistics/orders/{$orderId}/ship", ['carrier' => 'Transporte Insetti', 'tracking_number' => 'GUIA-001', 'vehicle' => 'UNIDAD-7', 'seal' => 'SELLO-99'])->assertRedirect();

        $this->assertSame(4.0, (float) $early->fresh()->quantity_current);
        $this->assertSame(10.0, (float) $late->fresh()->quantity_current);
        $this->assertDatabaseHas('sales_orders', ['id' => $orderId, 'status' => 'SHIPPED']);
        $this->assertDatabaseHas('inventory_movements', ['container_id' => $early->id, 'type' => 'SHIPMENT', 'quantity' => -6]);
        $this->assertDatabaseHas('shipments', ['sales_order_id' => $orderId, 'status' => 'SHIPPED']);

        $this->post('/mes/logistics/recalls', ['type' => 'MOCK', 'reference_type' => 'LOT', 'reference' => 'LOT-FEFO-1', 'reason' => 'Simulacro de retiro de producto terminado'])->assertRedirect();
        $recallId = DB::table('recall_events')->latest('id')->value('id');
        $shipmentId = DB::table('shipments')->where('sales_order_id', $orderId)->value('id');
        $this->assertDatabaseHas('recall_impacted_containers', ['recall_event_id' => $recallId, 'container_id' => $early->id, 'customer_id' => $customerId, 'shipment_id' => $shipmentId]);
        $this->assertTrue($early->fresh()->quarantined);
        $this->assertSame('HOLD', $early->fresh()->status);
    }

    public function test_customer_return_quarantines_the_shipped_container(): void
    {
        $part = Part::query()->where('code', 'FG001')->firstOrFail();
        $location = Location::query()->where('code', 'ALM-PT')->firstOrFail();
        $container = Container::query()->create(['serial' => 'RETURN-LOT', 'part_id' => $part->id, 'location_id' => $location->id, 'status' => 'SHIPPED', 'origin' => 'PRODUCTION', 'quantity_current' => 0, 'unit' => $part->unit, 'active' => false, 'quarantined' => false]);
        $customerId = DB::table('customers')->insertGetId(['code' => 'CUS-RET', 'name' => 'Cliente devolución', 'customer_type' => 'INDUSTRIAL', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $orderId = DB::table('sales_orders')->insertGetId(['number' => 'SO-RETURN', 'customer_id' => $customerId, 'status' => 'SHIPPED', 'priority' => 'NORMAL', 'requested_at' => now(), 'created_by' => User::first()->id, 'created_at' => now(), 'updated_at' => now()]);
        $lineId = DB::table('sales_order_lines')->insertGetId(['sales_order_id' => $orderId, 'part_id' => $part->id, 'ordered_quantity' => 5, 'allocated_quantity' => 5, 'shipped_quantity' => 5, 'unit' => $part->unit, 'status' => 'SHIPPED', 'created_at' => now(), 'updated_at' => now()]);
        $shipmentId = DB::table('shipments')->insertGetId(['number' => 'SHP-RETURN', 'sales_order_id' => $orderId, 'status' => 'SHIPPED', 'carrier' => 'Prueba', 'shipped_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
        DB::table('shipment_items')->insert(['shipment_id' => $shipmentId, 'sales_order_line_id' => $lineId, 'container_id' => $container->id, 'quantity' => 5, 'unit' => $part->unit, 'created_at' => now(), 'updated_at' => now()]);

        $this->post('/mes/logistics/returns', ['shipment_id' => $shipmentId, 'container_id' => $container->id, 'quantity' => 2, 'reason' => 'Empaque dañado', 'disposition' => 'QUARANTINE'])->assertRedirect();

        $this->assertDatabaseHas('customer_returns', ['shipment_id' => $shipmentId, 'container_id' => $container->id, 'status' => 'OPEN']);
        $this->assertTrue($container->fresh()->quarantined);
        $this->assertSame('HOLD', $container->fresh()->status);
    }
}
