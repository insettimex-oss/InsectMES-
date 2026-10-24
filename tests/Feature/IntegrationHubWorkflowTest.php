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
        $endpointId = (int) DB::table('integration_endpoints')->value('id');
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
