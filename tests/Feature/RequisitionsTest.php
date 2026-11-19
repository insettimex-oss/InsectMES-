<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RequisitionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->withoutVite();
        $user = User::where('email', 'operador@insetti.com')->firstOrFail();
        $user->update(['must_change_password' => false]);
        $this->actingAs($user);
    }

    private function payload(): array
    {
        $boot = $this->getJson('/mes/rev031/bootstrap')->assertOk()->json();

        return ['revision' => $boot['revision'], 'fingerprint' => $boot['fingerprint'], 'screen' => 'requisitions', 'state' => $boot['state']];
    }

    private function requestRow(): array
    {
        return ['id' => 'req-test-1', 'code' => 'REQ-000001', 'date' => '2026-11-12', 'requester' => 'Operación', 'reference' => 'Suministros',
            'lines' => array_map(fn ($text) => ['id' => $text, 'description' => $text, 'quantity' => '1 caja', 'unit' => '', 'notes' => 'Compra abierta', 'purchased' => false], ['Guantes', 'Cajas', 'Salvado'])];
    }

    public function test_staff_can_create_edit_and_remove_request_lines_without_affecting_inventory(): void
    {
        $inventory = Container::orderBy('id')->get(['serial', 'quantity_current'])->toArray();
        $payload = $this->payload();
        $payload['state']['requisitions31'] = [$this->requestRow()];
        $this->postJson('/mes/rev031/state', $payload)->assertOk();
        $payload = $this->payload();
        array_pop($payload['state']['requisitions31'][0]['lines']);
        $payload['state']['requisitions31'][0]['lines'][0]['quantity'] = '2 cajas';
        $this->postJson('/mes/rev031/state', $payload)->assertOk();
        $this->assertCount(2, $this->payload()['state']['requisitions31'][0]['lines']);
        $this->assertSame($inventory, Container::orderBy('id')->get(['serial', 'quantity_current'])->toArray());
    }

    public function test_only_purchase_permission_can_mark_a_line_and_number_cannot_be_changed(): void
    {
        $payload = $this->payload();
        $payload['state']['requisitions31'] = [$this->requestRow()];
        $this->postJson('/mes/rev031/state', $payload)->assertOk();
        $payload = $this->payload();
        $payload['state']['requisitions31'][0]['lines'][0]['purchased'] = true;
        $this->postJson('/mes/rev031/state', $payload)->assertForbidden();
        $this->actingAs(User::where('email', 'admin@insetti.com')->firstOrFail());
        $payload = $this->payload();
        $payload['state']['requisitions31'][0]['lines'][0]['purchased'] = true;
        $this->postJson('/mes/rev031/state', $payload)->assertOk();
        $payload = $this->payload();
        $payload['state']['requisitions31'][0]['code'] = 'REQ-000002';
        $this->postJson('/mes/rev031/state', $payload)->assertUnprocessable();
        $payload = $this->payload();
        $payload['state']['requisitions31'][0]['lines'] = [];
        $this->postJson('/mes/rev031/state', $payload)->assertUnprocessable();
    }

    public function test_request_write_does_not_authorize_inventory_changes_or_invalid_consecutive(): void
    {
        $payload = $this->payload();
        $payload['state']['serials'][0]['qtyCurrent'] += 1;
        $this->postJson('/mes/rev031/state', $payload)->assertForbidden();
        $payload = $this->payload();
        $row = $this->requestRow();
        $row['code'] = 'REQ-000005';
        $payload['state']['requisitions31'] = [$row];
        $this->postJson('/mes/rev031/state', $payload)->assertUnprocessable();
    }
}
