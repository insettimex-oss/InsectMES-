<?php

namespace App\Http\Controllers;

use App\Services\AuditService;
use App\Services\IntegrationHubService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use JsonException;

class MesIntegrationController extends Controller
{
    public function __construct(
        private readonly IntegrationHubService $hub,
        private readonly AuditService $audit,
    ) {}

    public function createEndpoint(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:integration_endpoints,code'],
            'name' => ['required', 'string', 'max:180'],
            'system' => ['required', 'string', 'max:80'],
            'direction' => ['required', Rule::in(['INBOUND', 'OUTBOUND', 'BIDIRECTIONAL'])],
            'transport' => ['required', Rule::in(['LOCAL', 'FILE', 'HTTP'])],
            'base_url' => ['nullable', 'url:http,https', 'max:500'],
            'secret_env_key' => ['nullable', 'regex:/^[A-Z][A-Z0-9_]*$/', 'max:120'],
            'timeout_seconds' => ['required', 'integer', 'between:1,120'],
            'max_attempts' => ['required', 'integer', 'between:1,20'],
            'retry_backoff_seconds' => ['required', 'integer', 'between:5,86400'],
        ]);
        if ($data['transport'] === 'HTTP' && empty($data['base_url'])) {
            throw ValidationException::withMessages(['base_url' => 'El transporte HTTP requiere una URL base.']);
        }

        $id = DB::table('integration_endpoints')->insertGetId([
            ...$data,
            'code' => strtoupper($data['code']),
            'base_url' => $data['base_url'] ?? null,
            'secret_env_key' => $data['secret_env_key'] ?? null,
            'active' => true,
            'health_status' => 'UNCHECKED',
            'created_by' => $request->user()->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->audit->record($request, 'INTEGRATION_ENDPOINT_CREATED', 'integration_endpoints', 'Endpoint registrado sin almacenar secretos', null, Arr::except($data, ['secret_env_key']) + ['has_secret_reference' => ! empty($data['secret_env_key'])], $id);

        return $this->success('Endpoint creado. Las credenciales permanecen fuera de la base de datos.');
    }

    public function queueOutbound(Request $request): RedirectResponse
    {
        $data = $this->messageData($request);
        $result = $this->hub->registerMessage(
            (int) $data['integration_endpoint_id'],
            'OUTBOUND',
            $data['message_type'],
            $data['idempotency_key'],
            $data['payload'],
            $data['correlation_id'] ?? null,
            $data['entity_type'] ?? null,
            $data['entity_id'] ?? null,
            $request->user()->id,
        );
        $message = $result['message'];
        $this->audit->record($request, $result['duplicate'] ? 'INTEGRATION_DUPLICATE_IGNORED' : 'INTEGRATION_MESSAGE_QUEUED', 'integration_messages', 'Mensaje de salida registrado con idempotencia', null, ['uuid' => $message->uuid, 'payload_sha256' => $message->payloadSha256, 'duplicate' => $result['duplicate']], $message->id);

        return $this->success($result['duplicate'] ? 'Mensaje duplicado reconocido; no se creó una segunda entrega.' : 'Mensaje agregado a la bandeja de salida.');
    }

    public function ingestInbound(Request $request): RedirectResponse
    {
        $data = $this->messageData($request);
        $result = $this->hub->registerMessage(
            (int) $data['integration_endpoint_id'],
            'INBOUND',
            $data['message_type'],
            $data['idempotency_key'],
            $data['payload'],
            $data['correlation_id'] ?? null,
            $data['entity_type'] ?? null,
            $data['entity_id'] ?? null,
            $request->user()->id,
        );
        $message = $result['message'];
        $this->audit->record($request, $result['duplicate'] ? 'INTEGRATION_DUPLICATE_IGNORED' : 'INTEGRATION_MESSAGE_RECEIVED', 'integration_messages', 'Mensaje de entrada reconocido con idempotencia', null, ['uuid' => $message->uuid, 'payload_sha256' => $message->payloadSha256, 'duplicate' => $result['duplicate']], $message->id);

        return $this->success($result['duplicate'] ? 'Entrada duplicada reconocida sin reprocesar.' : 'Entrada registrada y reconocida.');
    }

    public function dispatch(Request $request, int $message): RedirectResponse
    {
        $before = DB::table('integration_messages')->where('id', $message)->first();
        $after = $this->hub->dispatch($message);
        $this->audit->record($request, 'INTEGRATION_MESSAGE_DISPATCHED', 'integration_messages', 'Despacho manual controlado', $before ? (array) $before : null, (array) $after, $message);

        return $this->success($after->status === 'ACKNOWLEDGED' ? 'Mensaje entregado y reconocido.' : "Despacho registrado con estado {$after->status}.");
    }

    public function retry(Request $request, int $message): RedirectResponse
    {
        $before = DB::table('integration_messages')->where('id', $message)->first();
        $this->hub->retry($message);
        $after = DB::table('integration_messages')->where('id', $message)->first();
        $this->audit->record($request, 'INTEGRATION_MESSAGE_REQUEUED', 'integration_messages', 'Reintento autorizado por TI', $before ? (array) $before : null, $after ? (array) $after : null, $message);

        return $this->success('Mensaje preparado para un nuevo intento.');
    }

    public function processQueue(Request $request): RedirectResponse
    {
        $data = $request->validate(['limit' => ['nullable', 'integer', 'between:1,200']]);
        $summary = $this->hub->dispatchDue((int) ($data['limit'] ?? 50));
        $this->audit->record($request, 'INTEGRATION_QUEUE_PROCESSED', 'integration_messages', 'Procesamiento manual de cola', null, $summary);

        return $this->success("Cola procesada: {$summary['processed']} mensajes; {$summary['acknowledged']} reconocidos, {$summary['failed']} fallidos y {$summary['quarantined']} en cuarentena.");
    }

    public function reconcile(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'integration_endpoint_id' => ['required', 'exists:integration_endpoints,id'],
            'period_from' => ['required', 'date'],
            'period_to' => ['required', 'date', 'after_or_equal:period_from'],
            'expected_count' => ['required', 'integer', 'gte:0'],
            'notes' => ['nullable', 'string', 'max:2000'],
        ]);
        $messages = DB::table('integration_messages')->where('integration_endpoint_id', $data['integration_endpoint_id'])->whereBetween('created_at', [$data['period_from'], $data['period_to']]);
        $observed = (clone $messages)->count();
        $acknowledged = (clone $messages)->where('status', 'ACKNOWLEDGED')->count();
        $failed = (clone $messages)->whereIn('status', ['FAILED', 'QUARANTINED'])->count();
        $difference = $observed - (int) $data['expected_count'];
        $status = $difference === 0 && $failed === 0 && $acknowledged === $observed ? 'BALANCED' : 'DISCREPANCY';
        $id = DB::table('integration_reconciliations')->insertGetId([
            'integration_endpoint_id' => $data['integration_endpoint_id'],
            'period_from' => $data['period_from'],
            'period_to' => $data['period_to'],
            'expected_count' => $data['expected_count'],
            'observed_count' => $observed,
            'acknowledged_count' => $acknowledged,
            'failed_count' => $failed,
            'difference' => $difference,
            'status' => $status,
            'notes' => $data['notes'] ?? null,
            'generated_by' => $request->user()->id,
            'generated_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $this->audit->record($request, 'INTEGRATION_RECONCILIATION_CREATED', 'integration_reconciliations', 'Conciliación de conteos y reconocimientos', null, ['status' => $status, 'difference' => $difference, 'observed' => $observed, 'acknowledged' => $acknowledged, 'failed' => $failed], $id);

        return $this->success($status === 'BALANCED' ? 'Conciliación balanceada sin fallas.' : 'Conciliación registrada con diferencias para seguimiento.');
    }

    /** @return array{integration_endpoint_id: int, message_type: string, idempotency_key: string, payload: array<string, mixed>, correlation_id: string|null, entity_type: string|null, entity_id: string|null} */
    private function messageData(Request $request): array
    {
        $data = $request->validate([
            'integration_endpoint_id' => ['required', 'exists:integration_endpoints,id'],
            'message_type' => ['required', 'string', 'max:80'],
            'idempotency_key' => ['required', 'string', 'max:120'],
            'correlation_id' => ['nullable', 'string', 'max:120'],
            'entity_type' => ['nullable', 'string', 'max:100'],
            'entity_id' => ['nullable', 'string', 'max:100'],
            'payload_json' => ['required', 'string', 'max:50000'],
        ]);
        try {
            $payload = json_decode($data['payload_json'], true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw ValidationException::withMessages(['payload_json' => 'El payload debe ser un objeto JSON válido.']);
        }
        if (! is_array($payload) || array_is_list($payload)) {
            throw ValidationException::withMessages(['payload_json' => 'El payload debe ser un objeto JSON, no una lista o valor simple.']);
        }

        $normalizedPayload = [];
        foreach ($payload as $key => $value) {
            $normalizedPayload[(string) $key] = $value;
        }

        return [
            'integration_endpoint_id' => (int) $data['integration_endpoint_id'],
            'message_type' => (string) $data['message_type'],
            'idempotency_key' => (string) $data['idempotency_key'],
            'payload' => $normalizedPayload,
            'correlation_id' => isset($data['correlation_id']) ? (string) $data['correlation_id'] : null,
            'entity_type' => isset($data['entity_type']) ? (string) $data['entity_type'] : null,
            'entity_id' => isset($data['entity_id']) ? (string) $data['entity_id'] : null,
        ];
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
