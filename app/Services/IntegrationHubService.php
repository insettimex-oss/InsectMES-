<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class IntegrationHubService
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array{message: IntegrationMessageRecord, duplicate: bool}
     */
    public function registerMessage(
        int $endpointId,
        string $direction,
        string $messageType,
        string $idempotencyKey,
        array $payload,
        ?string $correlationId,
        ?string $entityType,
        ?string $entityId,
        ?int $userId,
    ): array {
        $endpoint = DB::table('integration_endpoints')->where('id', $endpointId)->where('active', true)->first();
        if ($endpoint === null) {
            throw ValidationException::withMessages(['integration_endpoint_id' => 'El endpoint no existe o está inactivo.']);
        }
        if (! in_array($endpoint->direction, [$direction, 'BIDIRECTIONAL'], true)) {
            throw ValidationException::withMessages(['direction' => 'La dirección del mensaje no está permitida para este endpoint.']);
        }

        $canonicalPayload = $this->canonicalJson($payload);
        $payloadHash = hash('sha256', $canonicalPayload);
        $existing = DB::table('integration_messages')
            ->where('integration_endpoint_id', $endpointId)
            ->where('direction', $direction)
            ->where('idempotency_key', $idempotencyKey)
            ->first();
        if ($existing !== null) {
            if (! hash_equals((string) $existing->payload_sha256, $payloadHash)) {
                throw ValidationException::withMessages(['idempotency_key' => 'La clave ya existe con un contenido diferente.']);
            }

            return ['message' => $this->hydrateMessage($existing), 'duplicate' => true];
        }

        $now = now();
        $id = DB::table('integration_messages')->insertGetId([
            'uuid' => (string) Str::uuid(),
            'integration_endpoint_id' => $endpointId,
            'direction' => $direction,
            'message_type' => $messageType,
            'idempotency_key' => $idempotencyKey,
            'correlation_id' => $correlationId,
            'entity_type' => $entityType,
            'entity_id' => $entityId,
            'payload' => $canonicalPayload,
            'payload_sha256' => $payloadHash,
            'status' => $direction === 'INBOUND' ? 'ACKNOWLEDGED' : 'PENDING',
            'attempt_count' => 0,
            'next_attempt_at' => $direction === 'OUTBOUND' ? $now : null,
            'acknowledged_at' => $direction === 'INBOUND' ? $now : null,
            'created_by' => $userId,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        return ['message' => $this->messageById($id), 'duplicate' => false];
    }

    public function dispatch(int $messageId): IntegrationMessageRecord
    {
        $claim = DB::transaction(function () use ($messageId): array {
            $messageRow = DB::table('integration_messages')->where('id', $messageId)->lockForUpdate()->first();
            if ($messageRow === null) {
                throw ValidationException::withMessages(['message' => 'El mensaje no existe.']);
            }
            $message = $this->hydrateMessage($messageRow);
            if ($message->direction !== 'OUTBOUND') {
                throw ValidationException::withMessages(['message' => 'Solo se despachan mensajes de salida.']);
            }
            if (in_array($message->status, ['ACKNOWLEDGED', 'QUARANTINED', 'PROCESSING'], true)) {
                throw ValidationException::withMessages(['message' => 'El mensaje no está disponible para despacho.']);
            }
            if ($message->nextAttemptAt !== null && now()->lt($message->nextAttemptAt)) {
                throw ValidationException::withMessages(['message' => 'El mensaje aún está dentro de su ventana de reintento.']);
            }
            $endpointRow = DB::table('integration_endpoints')->where('id', $message->integrationEndpointId)->where('active', true)->first();
            if ($endpointRow === null) {
                throw ValidationException::withMessages(['message' => 'El endpoint está inactivo o ya no existe.']);
            }
            $endpoint = $this->hydrateEndpoint($endpointRow);
            $attempt = $message->attemptCount + 1;
            DB::table('integration_messages')->where('id', $messageId)->update([
                'status' => 'PROCESSING',
                'attempt_count' => $attempt,
                'next_attempt_at' => null,
                'updated_at' => now(),
            ]);

            return ['message' => $message, 'endpoint' => $endpoint, 'attempt' => $attempt];
        });

        $started = now();
        $startedClock = hrtime(true);
        try {
            $result = $this->send($claim['endpoint'], $claim['message']);
        } catch (Throwable $exception) {
            $result = ['success' => false, 'code' => null, 'excerpt' => null, 'error' => mb_substr($exception->getMessage(), 0, 2000)];
        }
        $finished = now();
        $duration = max(0, (int) round((hrtime(true) - $startedClock) / 1_000_000));

        return DB::transaction(function () use ($messageId, $claim, $result, $started, $finished, $duration): IntegrationMessageRecord {
            $quarantined = ! $result['success'] && $claim['attempt'] >= $claim['endpoint']->maxAttempts;
            $status = $result['success'] ? 'ACKNOWLEDGED' : ($quarantined ? 'QUARANTINED' : 'FAILED');
            $retryAt = $status === 'FAILED'
                ? now()->addSeconds($claim['endpoint']->retryBackoffSeconds * (2 ** max(0, $claim['attempt'] - 1)))
                : null;
            DB::table('integration_attempts')->insert([
                'integration_message_id' => $messageId,
                'attempt_number' => $claim['attempt'],
                'status' => $status,
                'started_at' => $started,
                'finished_at' => $finished,
                'duration_ms' => $duration,
                'response_code' => $result['code'],
                'response_excerpt' => $result['excerpt'],
                'error' => $result['error'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('integration_messages')->where('id', $messageId)->update([
                'status' => $status,
                'next_attempt_at' => $retryAt,
                'last_error' => $result['error'],
                'response_code' => $result['code'],
                'response_excerpt' => $result['excerpt'],
                'dispatched_at' => $finished,
                'acknowledged_at' => $result['success'] ? $finished : null,
                'updated_at' => now(),
            ]);
            DB::table('integration_endpoints')->where('id', $claim['endpoint']->id)->update([
                'health_status' => $result['success'] ? 'HEALTHY' : 'DEGRADED',
                'last_health_at' => $finished,
                'last_health_message' => $result['success'] ? 'Último despacho reconocido.' : mb_substr((string) $result['error'], 0, 255),
                'updated_at' => now(),
            ]);

            return $this->messageById($messageId);
        });
    }

    public function retry(int $messageId): void
    {
        $updated = DB::table('integration_messages')
            ->where('id', $messageId)
            ->whereIn('status', ['FAILED', 'QUARANTINED'])
            ->update([
                'status' => 'PENDING',
                'next_attempt_at' => now(),
                'last_error' => null,
                'updated_at' => now(),
            ]);
        if ($updated === 0) {
            throw ValidationException::withMessages(['message' => 'Solo puede reintentar mensajes fallidos o en cuarentena.']);
        }
    }

    /** @return array{processed: int, acknowledged: int, failed: int, quarantined: int} */
    public function dispatchDue(int $limit = 50): array
    {
        $ids = DB::table('integration_messages')
            ->where('direction', 'OUTBOUND')
            ->whereIn('status', ['PENDING', 'FAILED'])
            ->where(fn ($query) => $query->whereNull('next_attempt_at')->orWhere('next_attempt_at', '<=', now()))
            ->orderBy('created_at')->limit($limit)->pluck('id');
        $summary = ['processed' => 0, 'acknowledged' => 0, 'failed' => 0, 'quarantined' => 0];
        foreach ($ids as $id) {
            try {
                $message = $this->dispatch((int) $id);
                $summary['processed']++;
                $key = strtolower((string) $message->status);
                if (isset($summary[$key])) {
                    $summary[$key]++;
                }
            } catch (ValidationException) {
                continue;
            }
        }

        return $summary;
    }

    /** @return array{success: bool, code: int|null, excerpt: string|null, error: string|null} */
    private function send(IntegrationEndpointRecord $endpoint, IntegrationMessageRecord $message): array
    {
        $payload = json_decode((string) $message->payload, true, flags: JSON_THROW_ON_ERROR);
        if ($endpoint->transport === 'LOCAL') {
            return ['success' => true, 'code' => 200, 'excerpt' => 'Reconocimiento local controlado.', 'error' => null];
        }
        if ($endpoint->transport === 'FILE') {
            $path = 'integrations/outbox/'.Str::slug($endpoint->code).'/'.$message->uuid.'.json';
            Storage::disk('local')->put($path, $this->canonicalJson([
                'message_id' => $message->uuid,
                'idempotency_key' => $message->idempotencyKey,
                'correlation_id' => $message->correlationId,
                'type' => $message->messageType,
                'payload' => $payload,
            ]));

            return ['success' => true, 'code' => 201, 'excerpt' => $path, 'error' => null];
        }
        if ($endpoint->transport !== 'HTTP' || empty($endpoint->baseUrl)) {
            return ['success' => false, 'code' => null, 'excerpt' => null, 'error' => 'El transporte no tiene una configuración ejecutable.'];
        }

        $request = Http::acceptJson()->timeout($endpoint->timeoutSeconds)->withHeaders([
            'X-Idempotency-Key' => $message->idempotencyKey,
            'X-Correlation-ID' => $message->correlationId ?: $message->uuid,
            'X-InsectMES-Message-ID' => $message->uuid,
        ]);
        if (! empty($endpoint->secretEnvKey)) {
            $secret = getenv($endpoint->secretEnvKey);
            if (is_string($secret) && $secret !== '') {
                $request = $request->withToken($secret);
            }
        }
        /** @var Response $response */
        $response = $request->post($endpoint->baseUrl, $payload);
        $excerpt = mb_substr($response->body(), 0, 2000);

        return [
            'success' => $response->successful(),
            'code' => $response->status(),
            'excerpt' => $excerpt,
            'error' => $response->successful() ? null : "HTTP {$response->status()}: {$excerpt}",
        ];
    }

    /** @param array<string, mixed> $payload */
    private function canonicalJson(array $payload): string
    {
        return json_encode(
            $this->canonicalize($payload),
            JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
        );
    }

    private function canonicalize(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }

        if (array_is_list($value)) {
            return array_map(fn (mixed $item): mixed => $this->canonicalize($item), $value);
        }

        ksort($value);

        return array_map(fn (mixed $item): mixed => $this->canonicalize($item), $value);
    }

    private function messageById(int $id): IntegrationMessageRecord
    {
        return $this->hydrateMessage(DB::table('integration_messages')->where('id', $id)->firstOrFail());
    }

    private function hydrateMessage(object $row): IntegrationMessageRecord
    {
        $data = get_object_vars($row);

        return new IntegrationMessageRecord(
            id: (int) ($data['id'] ?? 0),
            uuid: (string) ($data['uuid'] ?? ''),
            integrationEndpointId: (int) ($data['integration_endpoint_id'] ?? 0),
            direction: (string) ($data['direction'] ?? ''),
            messageType: (string) ($data['message_type'] ?? ''),
            idempotencyKey: (string) ($data['idempotency_key'] ?? ''),
            correlationId: isset($data['correlation_id']) ? (string) $data['correlation_id'] : null,
            payload: (string) ($data['payload'] ?? '{}'),
            payloadSha256: (string) ($data['payload_sha256'] ?? ''),
            status: (string) ($data['status'] ?? ''),
            attemptCount: (int) ($data['attempt_count'] ?? 0),
            nextAttemptAt: isset($data['next_attempt_at']) ? (string) $data['next_attempt_at'] : null,
        );
    }

    private function hydrateEndpoint(object $row): IntegrationEndpointRecord
    {
        $data = get_object_vars($row);

        return new IntegrationEndpointRecord(
            id: (int) ($data['id'] ?? 0),
            code: (string) ($data['code'] ?? ''),
            transport: (string) ($data['transport'] ?? ''),
            baseUrl: isset($data['base_url']) ? (string) $data['base_url'] : null,
            secretEnvKey: isset($data['secret_env_key']) ? (string) $data['secret_env_key'] : null,
            timeoutSeconds: (int) ($data['timeout_seconds'] ?? 30),
            maxAttempts: (int) ($data['max_attempts'] ?? 3),
            retryBackoffSeconds: (int) ($data['retry_backoff_seconds'] ?? 60),
        );
    }
}

final readonly class IntegrationMessageRecord
{
    public function __construct(
        public int $id,
        public string $uuid,
        public int $integrationEndpointId,
        public string $direction,
        public string $messageType,
        public string $idempotencyKey,
        public ?string $correlationId,
        public string $payload,
        public string $payloadSha256,
        public string $status,
        public int $attemptCount,
        public ?string $nextAttemptAt,
    ) {}
}

final readonly class IntegrationEndpointRecord
{
    public function __construct(
        public int $id,
        public string $code,
        public string $transport,
        public ?string $baseUrl,
        public ?string $secretEnvKey,
        public int $timeoutSeconds,
        public int $maxAttempts,
        public int $retryBackoffSeconds,
    ) {}
}
