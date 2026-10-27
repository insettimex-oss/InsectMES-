<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class IntegrationHubWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $it;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->it = User::query()->where('email', 'ti@insetti.com')->firstOrFail();
        $this->it->update(['must_change_password' => false]);
        $this->actingAs($this->it);
    }

    public function test_outbound_messages_are_idempotent_dispatched_and_reconciled(): void
    {
        $this->post('/mes/integrations/endpoints', [
            'code' => 'ERP-LOCAL',
            'name' => 'ERP local de validación',
            'system' => 'ERP',
            'direction' => 'BIDIRECTIONAL',
            'transport' => 'LOCAL',
            'timeout_seconds' => 10,
            'max_attempts' => 3,
            'retry_backoff_seconds' => 5,
        ])->assertRedirect();
        $endpointId = (int) DB::table('integration_endpoints')->where('code', 'ERP-LOCAL')->value('id');
        $message = [
            'integration_endpoint_id' => $endpointId,
            'message_type' => 'production.completed',
            'idempotency_key' => 'PO-100-COMPLETED',
            'correlation_id' => 'PO-100',
            'entity_type' => 'production_order',
            'entity_id' => '100',
            'payload_json' => '{"order":"PO-100","quantity":25}',
        ];

        $this->post('/mes/integrations/messages/outbound', $message)->assertRedirect();
        $this->post('/mes/integrations/messages/outbound', $message)->assertRedirect();
        $this->assertDatabaseCount('integration_messages', 1);
        $messageId = (int) DB::table('integration_messages')->value('id');

        $this->post("/mes/integrations/messages/{$messageId}/dispatch")->assertRedirect();
        $this->assertDatabaseHas('integration_messages', ['id' => $messageId, 'status' => 'ACKNOWLEDGED', 'attempt_count' => 1, 'response_code' => 200]);
        $this->assertDatabaseHas('integration_attempts', ['integration_message_id' => $messageId, 'attempt_number' => 1, 'status' => 'ACKNOWLEDGED']);

        $this->post('/mes/integrations/reconciliations', [
            'integration_endpoint_id' => $endpointId,
            'period_from' => now()->subMinute()->toDateTimeString(),
            'period_to' => now()->addMinute()->toDateTimeString(),
            'expected_count' => 1,
            'notes' => 'Conciliación del lote de prueba.',
        ])->assertRedirect();
        $this->assertDatabaseHas('integration_reconciliations', ['integration_endpoint_id' => $endpointId, 'status' => 'BALANCED', 'observed_count' => 1, 'acknowledged_count' => 1]);
        $this->assertDatabaseHas('audit_events', ['event' => 'INTEGRATION_DUPLICATE_IGNORED']);
        $this->assertDatabaseHas('audit_events', ['event' => 'INTEGRATION_RECONCILIATION_CREATED']);
    }

    public function test_same_idempotency_key_cannot_change_payload(): void
    {
        $endpointId = $this->createEndpoint('ERP-IDEMPOTENCY', 'LOCAL', 3);
        $base = [
            'integration_endpoint_id' => $endpointId,
            'message_type' => 'inventory.changed',
            'idempotency_key' => 'INV-001',
            'payload_json' => '{"quantity":10,"lot":{"code":"L-1","stage":"N5"}}',
        ];
        $this->post('/mes/integrations/messages/outbound', $base)->assertRedirect();
        $this->post('/mes/integrations/messages/outbound', [...$base, 'payload_json' => '{"lot":{"stage":"N5","code":"L-1"},"quantity":10}'])
            ->assertRedirect();
        $this->assertDatabaseCount('integration_messages', 1);
        $this->post('/mes/integrations/messages/outbound', [...$base, 'payload_json' => '{"quantity":11,"lot":{"code":"L-1","stage":"N5"}}'])
            ->assertSessionHasErrors('idempotency_key');
        $this->assertDatabaseCount('integration_messages', 1);
    }

    public function test_http_failures_use_backoff_and_end_in_quarantine(): void
    {
        Http::fake(['*' => Http::response('Servicio temporalmente no disponible', 503)]);
        $endpointId = $this->createEndpoint('ERP-HTTP', 'HTTP', 2, 'https://erp.example.test/events');
        $this->post('/mes/integrations/messages/outbound', [
            'integration_endpoint_id' => $endpointId,
            'message_type' => 'shipment.completed',
            'idempotency_key' => 'SHIP-001',
            'payload_json' => '{"shipment":"SHIP-001"}',
        ])->assertRedirect();
        $messageId = (int) DB::table('integration_messages')->value('id');

        $this->post("/mes/integrations/messages/{$messageId}/dispatch")->assertRedirect();
        $this->assertDatabaseHas('integration_messages', ['id' => $messageId, 'status' => 'FAILED', 'attempt_count' => 1, 'response_code' => 503]);
        DB::table('integration_messages')->where('id', $messageId)->update(['next_attempt_at' => now()->subSecond()]);
        $this->post("/mes/integrations/messages/{$messageId}/dispatch")->assertRedirect();
        $this->assertDatabaseHas('integration_messages', ['id' => $messageId, 'status' => 'QUARANTINED', 'attempt_count' => 2]);
        $this->assertDatabaseCount('integration_attempts', 2);

        $this->patch("/mes/integrations/messages/{$messageId}/retry")->assertRedirect();
        $this->assertDatabaseHas('integration_messages', ['id' => $messageId, 'status' => 'PENDING']);
    }

    public function test_read_only_roles_cannot_create_or_dispatch_integrations(): void
    {
        $planner = User::query()->where('email', 'planeacion@insetti.com')->firstOrFail();
        $planner->update(['must_change_password' => false]);
        $this->actingAs($planner)->get('/mes/integrations')->assertOk();
        $this->post('/mes/integrations/messages/outbound', [])->assertForbidden();
        $this->post('/mes/integrations/endpoints', [])->assertForbidden();
    }

    public function test_alegra_endpoints_are_seeded_inactive_and_cannot_activate_without_credentials(): void
    {
        $endpoint = DB::table('integration_endpoints')->where('code', 'ALEGRA-CONTACTS')->firstOrFail();

        $this->assertFalse((bool) $endpoint->active);
        $this->assertSame('ALEGRA', $endpoint->connector_driver);
        $this->patch("/mes/integrations/endpoints/{$endpoint->id}/status", ['active' => true])
            ->assertSessionHasErrors('active');
        $this->assertDatabaseHas('integration_endpoints', ['id' => $endpoint->id, 'active' => false]);
    }

    public function test_alegra_contact_contract_maps_fields_and_uses_basic_auth(): void
    {
        config()->set('services.alegra.email', 'integraciones@insetti.test');
        config()->set('services.alegra.token', 'token-prueba');
        Http::fake(['https://api.alegra.com/*' => Http::response(['id' => '501'], 200)]);
        $endpoint = DB::table('integration_endpoints')->where('code', 'ALEGRA-CONTACTS')->firstOrFail();

        $this->patch("/mes/integrations/endpoints/{$endpoint->id}/status", ['active' => true])->assertRedirect();
        $this->post('/mes/integrations/messages/outbound', [
            'integration_endpoint_id' => $endpoint->id,
            'message_type' => 'ALEGRA_CONTACT_CREATE',
            'idempotency_key' => 'ALEGRA-CONTACT-C-100',
            'entity_type' => 'customer',
            'entity_id' => '100',
            'payload_json' => json_encode([
                'name' => 'Cliente piloto Insetti',
                'identification' => 'XAXX010101000',
                'phone_primary' => '5555555555',
                'email' => 'cliente@example.test',
                'ignore_repeated' => true,
            ], JSON_THROW_ON_ERROR),
        ])->assertRedirect();
        $messageId = (int) DB::table('integration_messages')->where('integration_endpoint_id', $endpoint->id)->value('id');
        $this->post("/mes/integrations/messages/{$messageId}/dispatch")->assertRedirect();

        Http::assertSent(fn ($request): bool => $request->url() === 'https://api.alegra.com/api/v1/contacts'
            && $request->hasHeader('Authorization', 'Basic '.base64_encode('integraciones@insetti.test:token-prueba'))
            && $request['name'] === 'Cliente piloto Insetti'
            && $request['phonePrimary'] === '5555555555'
            && $request['ignoreRepeated'] === true);
        $this->assertDatabaseHas('integration_messages', ['id' => $messageId, 'status' => 'ACKNOWLEDGED']);
    }

    public function test_alegra_invoice_contract_maps_required_accounting_fields(): void
    {
        config()->set('services.alegra.email', 'integraciones@insetti.test');
        config()->set('services.alegra.token', 'token-prueba');
        Http::fake(['https://api.alegra.com/*' => Http::response(['id' => '901'], 200)]);
        $endpoint = DB::table('integration_endpoints')->where('code', 'ALEGRA-INVOICES')->firstOrFail();

        $this->patch("/mes/integrations/endpoints/{$endpoint->id}/status", ['active' => true])->assertRedirect();
        $this->post('/mes/integrations/messages/outbound', [
            'integration_endpoint_id' => $endpoint->id,
            'message_type' => 'ALEGRA_INVOICE_CREATE',
            'idempotency_key' => 'ALEGRA-INVOICE-PED-100',
            'entity_type' => 'sales_order',
            'entity_id' => '100',
            'payload_json' => json_encode([
                'client_id' => '25',
                'date' => '2026-10-27',
                'due_date' => '2026-11-26',
                'items' => [['id' => '70', 'price' => 145.5, 'quantity' => 2]],
                'warehouse_id' => '3',
                'status' => 'draft',
            ], JSON_THROW_ON_ERROR),
        ])->assertRedirect();
        $messageId = (int) DB::table('integration_messages')->where('integration_endpoint_id', $endpoint->id)->value('id');
        $this->post("/mes/integrations/messages/{$messageId}/dispatch")->assertRedirect();

        Http::assertSent(fn ($request): bool => $request->url() === 'https://api.alegra.com/api/v1/invoices'
            && $request['client'] === '25'
            && $request['dueDate'] === '2026-11-26'
            && $request['warehouse'] === '3'
            && $request['items'][0]['id'] === '70'
            && $request['items'][0]['price'] === 145.5);
        $this->assertDatabaseHas('integration_messages', ['id' => $messageId, 'status' => 'ACKNOWLEDGED']);
    }

    public function test_alegra_connector_rejects_non_official_destination(): void
    {
        $this->post('/mes/integrations/endpoints', [
            'code' => 'ALEGRA-UNSAFE',
            'name' => 'Destino no autorizado',
            'system' => 'Alegra',
            'direction' => 'OUTBOUND',
            'transport' => 'HTTP',
            'connector_driver' => 'ALEGRA',
            'base_url' => 'https://example.test/api/v1/contacts',
            'auth_scheme' => 'BASIC_ENV',
            'username_env_key' => 'ALEGRA_API_EMAIL',
            'secret_env_key' => 'ALEGRA_API_TOKEN',
            'active' => false,
            'timeout_seconds' => 30,
            'max_attempts' => 3,
            'retry_backoff_seconds' => 60,
        ])->assertSessionHasErrors('base_url');

        $this->assertDatabaseMissing('integration_endpoints', ['code' => 'ALEGRA-UNSAFE']);
    }

    private function createEndpoint(string $code, string $transport, int $maxAttempts, ?string $url = null): int
    {
        $this->post('/mes/integrations/endpoints', [
            'code' => $code,
            'name' => "Endpoint {$code}",
            'system' => 'ERP',
            'direction' => 'BIDIRECTIONAL',
            'transport' => $transport,
            'base_url' => $url,
            'timeout_seconds' => 10,
            'max_attempts' => $maxAttempts,
            'retry_backoff_seconds' => 5,
        ])->assertRedirect();

        return (int) DB::table('integration_endpoints')->where('code', $code)->value('id');
    }
}
