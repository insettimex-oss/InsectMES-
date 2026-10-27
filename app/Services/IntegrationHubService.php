<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class IntegrationHubService
{
    private const ALEGRA_CONTACTS_URL = 'https://api.alegra.com/api/v1/contacts';

    private const ALEGRA_INVOICES_URL = 'https://api.alegra.com/api/v1/invoices';

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
        if ($direction === 'OUTBOUND' && ($endpoint->connector_driver ?? 'GENERIC') === 'ALEGRA') {
            $this->prepareAlegraPayload((string) $endpoint->base_url, $messageType, $payload);
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
        if ($endpoint->connectorDriver === 'ALEGRA') {
            $payload = $this->prepareAlegraPayload($endpoint->baseUrl, $message->messageType, $payload);
            $readiness = $this->endpointReadiness($endpoint);
            if (! $readiness['ready']) {
                throw ValidationException::withMessages(['credentials' => $readiness['message']]);
            }
            $request = $request->withBasicAuth(
                (string) $this->credential($endpoint->usernameEnvKey),
                (string) $this->credential($endpoint->secretEnvKey),
            );
        } elseif ($endpoint->authScheme === 'BEARER' && ! empty($endpoint->secretEnvKey)) {
            $secret = $this->credential($endpoint->secretEnvKey);
            if ($secret !== null) {
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

    /** @return array{ready: bool, message: string} */
    public function endpointReadiness(object $endpoint): array
    {
        $record = $endpoint instanceof IntegrationEndpointRecord ? $endpoint : $this->hydrateEndpoint($endpoint);
        if ($record->connectorDriver !== 'ALEGRA') {
            if ($record->authScheme === 'NONE') {
                return ['ready' => true, 'message' => 'No requiere credenciales.'];
            }

            return $this->credential($record->secretEnvKey) !== null
                ? ['ready' => true, 'message' => 'Referencia de credencial disponible.']
                : ['ready' => false, 'message' => 'Falta la credencial indicada por el endpoint.'];
        }

        try {
            $this->validateEndpointConfiguration($record);
        } catch (ValidationException $exception) {
            return ['ready' => false, 'message' => $exception->getMessage()];
        }

        if ($this->credential($record->usernameEnvKey) === null || $this->credential($record->secretEnvKey) === null) {
            return ['ready' => false, 'message' => 'Faltan ALEGRA_API_EMAIL o ALEGRA_API_TOKEN en el entorno del servidor.'];
        }

        return ['ready' => true, 'message' => 'Credenciales referenciadas y destino oficial verificado.'];
    }

    public function validateEndpointConfiguration(object $endpoint): void
    {
        $record = $endpoint instanceof IntegrationEndpointRecord ? $endpoint : $this->hydrateEndpoint($endpoint);
        if ($record->connectorDriver !== 'ALEGRA') {
            return;
        }
        $this->assertAlegraUrl((string) $record->baseUrl);
        if ($record->transport !== 'HTTP' || $record->authScheme !== 'BASIC_ENV') {
            throw ValidationException::withMessages(['connector_driver' => 'Alegra requiere transporte HTTP y autenticación BASIC_ENV.']);
        }
        if ($record->usernameEnvKey !== 'ALEGRA_API_EMAIL' || $record->secretEnvKey !== 'ALEGRA_API_TOKEN') {
            throw ValidationException::withMessages(['credentials' => 'Alegra solo admite las referencias ALEGRA_API_EMAIL y ALEGRA_API_TOKEN.']);
        }
    }

    /** @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function prepareAlegraPayload(string $url, string $messageType, array $payload): array
    {
        $resource = $this->assertAlegraUrl($url);
        if ($resource === 'contacts') {
            if ($messageType !== 'ALEGRA_CONTACT_CREATE') {
                throw ValidationException::withMessages(['message_type' => 'El endpoint de contactos solo admite ALEGRA_CONTACT_CREATE.']);
            }
            $data = Validator::make($payload, [
                'name' => ['required', 'string', 'max:180'],
                'identification' => ['nullable', 'string', 'max:80'],
                'address' => ['nullable', 'array'],
                'phone_primary' => ['nullable', 'string', 'max:80'],
                'phone_secondary' => ['nullable', 'string', 'max:80'],
                'mobile' => ['nullable', 'string', 'max:80'],
                'email' => ['nullable', 'email', 'max:180'],
                'status' => ['nullable', 'in:active,inactive'],
                'ignore_repeated' => ['nullable', 'boolean'],
            ], [
                'name.required' => 'El contrato de contacto Alegra requiere name.',
            ])->validate();

            return array_filter([
                'name' => $data['name'],
                'identification' => $data['identification'] ?? null,
                'address' => $data['address'] ?? null,
                'phonePrimary' => $data['phone_primary'] ?? null,
                'phoneSecondary' => $data['phone_secondary'] ?? null,
                'mobile' => $data['mobile'] ?? null,
                'email' => $data['email'] ?? null,
                'status' => $data['status'] ?? null,
                'ignoreRepeated' => $data['ignore_repeated'] ?? null,
            ], static fn (mixed $value): bool => $value !== null && $value !== '');
        }

        if ($messageType !== 'ALEGRA_INVOICE_CREATE') {
            throw ValidationException::withMessages(['message_type' => 'El endpoint de facturas solo admite ALEGRA_INVOICE_CREATE.']);
        }
        $data = Validator::make($payload, [
            'client_id' => ['required'],
            'date' => ['required', 'date_format:Y-m-d'],
            'due_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:date'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.id' => ['required'],
            'items.*.price' => ['required', 'numeric', 'gte:0'],
            'items.*.quantity' => ['required', 'numeric', 'gt:0'],
            'items.*.reference' => ['nullable', 'string', 'max:100'],
            'items.*.description' => ['nullable', 'string', 'max:500'],
            'status' => ['nullable', 'in:draft,open'],
            'warehouse_id' => ['nullable'],
            'cost_center_id' => ['nullable'],
            'observations' => ['nullable', 'string', 'max:500'],
        ], [
            'client_id.required' => 'El contrato de factura Alegra requiere client_id.',
            'items.required' => 'El contrato de factura Alegra requiere al menos un item.',
        ])->validate();
        $items = array_map(static fn (array $item): array => array_filter([
            'id' => $item['id'],
            'price' => (float) $item['price'],
            'quantity' => (float) $item['quantity'],
            'reference' => $item['reference'] ?? null,
            'description' => $item['description'] ?? null,
        ], static fn (mixed $value): bool => $value !== null && $value !== ''), $data['items']);

        return array_filter([
            'client' => $data['client_id'],
            'date' => $data['date'],
            'dueDate' => $data['due_date'],
            'items' => $items,
            'status' => $data['status'] ?? null,
            'warehouse' => $data['warehouse_id'] ?? null,
            'costCenter' => $data['cost_center_id'] ?? null,
            'observations' => $data['observations'] ?? null,
        ], static fn (mixed $value): bool => $value !== null && $value !== '');
    }

    private function assertAlegraUrl(string $url): string
    {
        $normalized = rtrim($url, '/');
        $parts = parse_url($normalized);
        $allowed = [
            self::ALEGRA_CONTACTS_URL => 'contacts',
            self::ALEGRA_INVOICES_URL => 'invoices',
        ];
        if (($parts['scheme'] ?? '') !== 'https' || ($parts['host'] ?? '') !== 'api.alegra.com' || ! isset($allowed[$normalized])) {
            throw ValidationException::withMessages(['base_url' => 'Alegra solo puede usar sus endpoints HTTPS oficiales de contacts o invoices.']);
        }

        return $allowed[$normalized];
    }

    private function credential(?string $key): ?string
    {
        if ($key === null || $key === '') {
            return null;
        }
        $configured = match ($key) {
            'ALEGRA_API_EMAIL' => config('services.alegra.email'),
            'ALEGRA_API_TOKEN' => config('services.alegra.token'),
            default => getenv($key),
        };

        return is_string($configured) && trim($configured) !== '' ? trim($configured) : null;
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
            connectorDriver: (string) ($data['connector_driver'] ?? 'GENERIC'),
            baseUrl: isset($data['base_url']) ? (string) $data['base_url'] : null,
            authScheme: (string) ($data['auth_scheme'] ?? (! empty($data['secret_env_key']) ? 'BEARER' : 'NONE')),
            usernameEnvKey: isset($data['username_env_key']) ? (string) $data['username_env_key'] : null,
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
        public string $connectorDriver,
        public ?string $baseUrl,
        public string $authScheme,
        public ?string $usernameEnvKey,
        public ?string $secretEnvKey,
        public int $timeoutSeconds,
        public int $maxAttempts,
        public int $retryBackoffSeconds,
    ) {}
}
