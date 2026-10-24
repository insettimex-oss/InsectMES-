import { type FormEvent, type ReactNode, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    Activity,
    Cable,
    CircleCheck,
    ListRestart,
    MessageSquareMore,
    Plus,
    RefreshCw,
    Send,
    ShieldAlert,
} from 'lucide-react';
import { MesRecordDialog } from '@/components/mes-record-dialog';

type Item = Record<string, unknown>;
type Dialog = 'endpoint' | 'outbound' | 'inbound' | 'reconcile' | null;

const value = (input: unknown, fallback = '—'): string => {
    if (input === null || input === undefined || input === '') return fallback;
    if (
        typeof input === 'string' ||
        typeof input === 'number' ||
        typeof input === 'boolean'
    ) {
        return String(input);
    }
    return JSON.stringify(input);
};
const date = (input: unknown) =>
    input ? new Date(value(input)).toLocaleString('es-MX') : '—';
const statusLabel = (input: unknown) =>
    ({
        UNCHECKED: 'SIN VERIFICAR',
        HEALTHY: 'SALUDABLE',
        DEGRADED: 'DEGRADADO',
        PENDING: 'PENDIENTE',
        PROCESSING: 'PROCESANDO',
        ACKNOWLEDGED: 'RECONOCIDO',
        FAILED: 'FALLIDO',
        QUARANTINED: 'CUARENTENA',
        BALANCED: 'CONCILIADO',
        DISCREPANCY: 'CON DIFERENCIA',
        INBOUND: 'ENTRADA',
        OUTBOUND: 'SALIDA',
        BIDIRECTIONAL: 'BIDIRECCIONAL',
    })[value(input)] ?? value(input);

function Status({ children }: { children: unknown }) {
    const raw = value(children);
    return (
        <span
            className={`status-pill status-${raw.toLowerCase().replaceAll('_', '-')}`}
        >
            {statusLabel(raw)}
        </span>
    );
}

function Metric({
    icon: Icon,
    label,
    metric,
    detail,
}: {
    icon: typeof Cable;
    label: string;
    metric: string;
    detail: string;
}) {
    return (
        <article className="phase-metric">
            <Icon />
            <span>{label}</span>
            <strong>{metric}</strong>
            <small>{detail}</small>
        </article>
    );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="mes-card">
            <header>
                <h2>{title}</h2>
            </header>
            {children}
        </section>
    );
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
    return (
        <div className="table-shell">
            <table>
                <thead>
                    <tr>
                        {headers.map((header) => (
                            <th key={header}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {row.map((cell, cellIndex) => (
                                <td
                                    className={
                                        cellIndex === 0 ? 'code-cell' : ''
                                    }
                                    key={cellIndex}
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={headers.length}>
                                <div className="empty-state">
                                    Sin registros.
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

function ErrorMessage({ errors }: { errors: Record<string, string> }) {
    const first = Object.values(errors)[0];
    return first ? <p className="form-error">{first}</p> : null;
}

export function IntegrationSection({
    data,
}: {
    data: {
        integrationEndpoints?: Item[];
        integrationMessages?: Item[];
        integrationAttempts?: Item[];
        integrationReconciliations?: Item[];
        activeIntegrationEndpoints?: Item[];
        integrationSummary?: Item;
    };
}) {
    const permissions = usePage().props.auth.user?.permissions ?? [];
    const canWrite = permissions.includes('integrations.write');
    const canAdmin = permissions.includes('integrations.admin');
    const endpoints = data.integrationEndpoints ?? [];
    const messages = data.integrationMessages ?? [];
    const attempts = data.integrationAttempts ?? [];
    const reconciliations = data.integrationReconciliations ?? [];
    const activeEndpoints = data.activeIntegrationEndpoints ?? [];
    const summary = data.integrationSummary ?? {};
    const [dialog, setDialog] = useState<Dialog>(null);

    const endpointForm = useForm({
        code: '',
        name: '',
        system: 'ERP',
        direction: 'BIDIRECTIONAL',
        transport: 'LOCAL',
        base_url: '',
        secret_env_key: '',
        timeout_seconds: '10',
        max_attempts: '5',
        retry_backoff_seconds: '60',
    });
    const messageForm = useForm({
        integration_endpoint_id: '',
        message_type: '',
        idempotency_key: '',
        correlation_id: '',
        entity_type: '',
        entity_id: '',
        payload_json: '{\n  "event": "production.completed"\n}',
    });
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const reconcileForm = useForm({
        integration_endpoint_id: '',
        period_from: start.toISOString().slice(0, 16),
        period_to: now.toISOString().slice(0, 16),
        expected_count: '0',
        notes: '',
    });

    const close = (reset?: () => void) => {
        reset?.();
        setDialog(null);
    };
    const submitEndpoint = (event: FormEvent) => {
        event.preventDefault();
        endpointForm.post('/mes/integrations/endpoints', {
            preserveScroll: true,
            onSuccess: () => close(() => endpointForm.reset()),
        });
    };
    const submitMessage = (event: FormEvent) => {
        event.preventDefault();
        const path =
            dialog === 'inbound'
                ? '/mes/integrations/messages/inbound'
                : '/mes/integrations/messages/outbound';
        messageForm.post(path, {
            preserveScroll: true,
            onSuccess: () => close(() => messageForm.reset()),
        });
    };
    const submitReconciliation = (event: FormEvent) => {
        event.preventDefault();
        reconcileForm.post('/mes/integrations/reconciliations', {
            preserveScroll: true,
            onSuccess: () => close(() => reconcileForm.reset()),
        });
    };

    return (
        <div className="stack-xl">
            <div className="info-callout">
                <Cable />
                <div>
                    <b>Conectividad controlada, no simulada</b>
                    <p>
                        LOCAL y FILE permiten verificar el motor sin terceros.
                        HTTP solo se considera conectado cuando exista una URL,
                        una credencial por variable de entorno y evidencia de
                        reconocimientos reales.
                    </p>
                </div>
            </div>

            <div className="phase-metrics">
                <Metric
                    icon={Cable}
                    label="Endpoints activos"
                    metric={value(summary.activeEndpoints, '0')}
                    detail="Sistemas habilitados"
                />
                <Metric
                    icon={MessageSquareMore}
                    label="Pendientes"
                    metric={value(summary.pendingMessages, '0')}
                    detail="Incluye reintentos programados"
                />
                <Metric
                    icon={ShieldAlert}
                    label="En cuarentena"
                    metric={value(summary.quarantinedMessages, '0')}
                    detail="Requieren intervención de TI"
                />
                <Metric
                    icon={CircleCheck}
                    label="Reconocimiento"
                    metric={`${value(summary.successRate, '0')}%`}
                    detail="Sobre mensajes resueltos"
                />
            </div>

            {(canWrite || canAdmin) && (
                <div className="record-actions">
                    {canAdmin && (
                        <button
                            className="secondary-button"
                            onClick={() => setDialog('endpoint')}
                            type="button"
                        >
                            <Plus /> Endpoint
                        </button>
                    )}
                    {canWrite && (
                        <>
                            <button
                                className="secondary-button"
                                onClick={() => setDialog('inbound')}
                                type="button"
                            >
                                <MessageSquareMore /> Registrar entrada
                            </button>
                            <button
                                className="primary-button"
                                onClick={() => setDialog('outbound')}
                                type="button"
                            >
                                <Send /> Encolar salida
                            </button>
                        </>
                    )}
                    {canAdmin && (
                        <>
                            <button
                                className="secondary-button"
                                onClick={() =>
                                    router.post(
                                        '/mes/integrations/process',
                                        { limit: 50 },
                                        { preserveScroll: true },
                                    )
                                }
                                type="button"
                            >
                                <ListRestart /> Procesar cola
                            </button>
                            <button
                                className="secondary-button"
                                onClick={() => setDialog('reconcile')}
                                type="button"
                            >
                                <Activity /> Conciliar
                            </button>
                        </>
                    )}
                </div>
            )}

            <Card title="Endpoints y estado operativo">
                <Table
                    headers={[
                        'Código',
                        'Sistema',
                        'Dirección',
                        'Transporte',
                        'Destino / secreto',
                        'Salud',
                    ]}
                    rows={endpoints.map((endpoint) => [
                        <div>
                            <b>{value(endpoint.code)}</b>
                            <small>{value(endpoint.name)}</small>
                        </div>,
                        value(endpoint.system),
                        <Status>{endpoint.direction}</Status>,
                        value(endpoint.transport),
                        <div>
                            {value(endpoint.base_url)}
                            <small>
                                {endpoint.secret_env_key
                                    ? `ENV: ${value(endpoint.secret_env_key)}`
                                    : 'Sin secreto requerido'}
                            </small>
                        </div>,
                        <div>
                            <Status>{endpoint.health_status}</Status>
                            <small>{date(endpoint.last_health_at)}</small>
                        </div>,
                    ])}
                />
            </Card>

            <Card title="Bandeja de mensajes">
                <Table
                    headers={[
                        'Mensaje',
                        'Endpoint / dirección',
                        'Tipo y entidad',
                        'Intentos',
                        'Estado',
                        'Acción',
                    ]}
                    rows={messages.map((message) => [
                        <div>
                            <b>{value(message.uuid).slice(0, 12)}…</b>
                            <small>{date(message.created_at)}</small>
                        </div>,
                        <div>
                            {value(message.endpoint_code)}
                            <small>{statusLabel(message.direction)}</small>
                        </div>,
                        <div>
                            {value(message.message_type)}
                            <small>
                                {value(message.entity_type)} #
                                {value(message.entity_id)}
                            </small>
                        </div>,
                        <div>
                            {value(message.attempt_count, '0')}
                            <small>{date(message.next_attempt_at)}</small>
                        </div>,
                        <div>
                            <Status>{message.status}</Status>
                            <small>{value(message.last_error)}</small>
                        </div>,
                        <div className="table-actions">
                            {canAdmin &&
                                message.direction === 'OUTBOUND' &&
                                ['PENDING', 'FAILED'].includes(
                                    value(message.status),
                                ) && (
                                    <button
                                        className="table-action"
                                        onClick={() =>
                                            router.post(
                                                `/mes/integrations/messages/${value(message.id)}/dispatch`,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                        type="button"
                                    >
                                        Despachar
                                    </button>
                                )}
                            {canAdmin &&
                                ['FAILED', 'QUARANTINED'].includes(
                                    value(message.status),
                                ) && (
                                    <button
                                        className="table-action"
                                        onClick={() =>
                                            router.patch(
                                                `/mes/integrations/messages/${value(message.id)}/retry`,
                                                {},
                                                { preserveScroll: true },
                                            )
                                        }
                                        type="button"
                                    >
                                        <RefreshCw /> Reintentar
                                    </button>
                                )}
                        </div>,
                    ])}
                />
            </Card>

            <Card title="Intentos de entrega">
                <Table
                    headers={[
                        'Inicio',
                        'Endpoint',
                        'Intento',
                        'Duración',
                        'Respuesta',
                        'Estado',
                    ]}
                    rows={attempts.map((attempt) => [
                        date(attempt.started_at),
                        value(attempt.endpoint_code),
                        `#${value(attempt.attempt_number)}`,
                        `${value(attempt.duration_ms, '0')} ms`,
                        <div>
                            {value(attempt.response_code)}
                            <small>
                                {value(
                                    attempt.error ?? attempt.response_excerpt,
                                )}
                            </small>
                        </div>,
                        <Status>{attempt.status}</Status>,
                    ])}
                />
            </Card>

            <Card title="Conciliaciones">
                <Table
                    headers={[
                        'Periodo',
                        'Endpoint',
                        'Esperados / observados',
                        'Reconocidos',
                        'Fallidos',
                        'Estado',
                    ]}
                    rows={reconciliations.map((row) => [
                        <div>
                            {date(row.period_from)}
                            <small>hasta {date(row.period_to)}</small>
                        </div>,
                        value(row.endpoint_code),
                        `${value(row.expected_count)} / ${value(row.observed_count)}`,
                        value(row.acknowledged_count),
                        value(row.failed_count),
                        <Status>{row.status}</Status>,
                    ])}
                />
            </Card>

            <MesRecordDialog
                open={dialog === 'endpoint'}
                onOpenChange={(isOpen) => !isOpen && close()}
                title="Registrar endpoint"
                description="Configura el contrato técnico. Los secretos se referencian por variable de entorno."
            >
                <form className="mes-form" onSubmit={submitEndpoint}>
                    <div className="form-grid">
                        <label>
                            Código
                            <input
                                required
                                value={endpointForm.data.code}
                                onChange={(event) =>
                                    endpointForm.setData(
                                        'code',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="ERP-PLEX"
                            />
                        </label>
                        <label>
                            Nombre
                            <input
                                required
                                value={endpointForm.data.name}
                                onChange={(event) =>
                                    endpointForm.setData(
                                        'name',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Sistema
                            <input
                                required
                                value={endpointForm.data.system}
                                onChange={(event) =>
                                    endpointForm.setData(
                                        'system',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Dirección
                            <select
                                value={endpointForm.data.direction}
                                onChange={(event) =>
                                    endpointForm.setData(
                                        'direction',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="INBOUND">Entrada</option>
                                <option value="OUTBOUND">Salida</option>
                                <option value="BIDIRECTIONAL">
                                    Bidireccional
                                </option>
                            </select>
                        </label>
                        <label>
                            Transporte
                            <select
                                value={endpointForm.data.transport}
                                onChange={(event) =>
                                    endpointForm.setData(
                                        'transport',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="LOCAL">Local de prueba</option>
                                <option value="FILE">Archivo controlado</option>
                                <option value="HTTP">HTTP/JSON</option>
                            </select>
                        </label>
                        <label>
                            URL HTTP
                            <input
                                type="url"
                                value={endpointForm.data.base_url}
                                onChange={(event) =>
                                    endpointForm.setData(
                                        'base_url',
                                        event.target.value,
                                    )
                                }
                                placeholder="https://erp.example/api/events"
                            />
                        </label>
                        <label>
                            Variable de entorno del secreto
                            <input
                                value={endpointForm.data.secret_env_key}
                                onChange={(event) =>
                                    endpointForm.setData(
                                        'secret_env_key',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="PLEX_API_TOKEN"
                            />
                        </label>
                        <label>
                            Timeout (segundos)
                            <input
                                required
                                type="number"
                                min="1"
                                max="120"
                                value={endpointForm.data.timeout_seconds}
                                onChange={(event) =>
                                    endpointForm.setData(
                                        'timeout_seconds',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Intentos máximos
                            <input
                                required
                                type="number"
                                min="1"
                                max="20"
                                value={endpointForm.data.max_attempts}
                                onChange={(event) =>
                                    endpointForm.setData(
                                        'max_attempts',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Espera inicial de reintento (s)
                            <input
                                required
                                type="number"
                                min="5"
                                value={endpointForm.data.retry_backoff_seconds}
                                onChange={(event) =>
                                    endpointForm.setData(
                                        'retry_backoff_seconds',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <ErrorMessage errors={endpointForm.errors} />
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={endpointForm.processing}
                        >
                            <Plus /> Crear endpoint
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'outbound' || dialog === 'inbound'}
                onOpenChange={(isOpen) => !isOpen && close()}
                title={
                    dialog === 'inbound'
                        ? 'Registrar mensaje de entrada'
                        : 'Encolar mensaje de salida'
                }
                description="La combinación endpoint, dirección y clave de idempotencia evita duplicados."
            >
                <form className="mes-form" onSubmit={submitMessage}>
                    <label>
                        Endpoint
                        <select
                            required
                            value={messageForm.data.integration_endpoint_id}
                            onChange={(event) =>
                                messageForm.setData(
                                    'integration_endpoint_id',
                                    event.target.value,
                                )
                            }
                        >
                            <option value="">Selecciona…</option>
                            {activeEndpoints
                                .filter((endpoint) => {
                                    const direction = value(endpoint.direction);
                                    return (
                                        direction === 'BIDIRECTIONAL' ||
                                        direction ===
                                            (dialog === 'inbound'
                                                ? 'INBOUND'
                                                : 'OUTBOUND')
                                    );
                                })
                                .map((endpoint) => (
                                    <option
                                        key={value(endpoint.id)}
                                        value={value(endpoint.id)}
                                    >
                                        {value(endpoint.code)} ·{' '}
                                        {value(endpoint.transport)}
                                    </option>
                                ))}
                        </select>
                    </label>
                    <div className="form-grid">
                        <label>
                            Tipo de mensaje
                            <input
                                required
                                value={messageForm.data.message_type}
                                onChange={(event) =>
                                    messageForm.setData(
                                        'message_type',
                                        event.target.value,
                                    )
                                }
                                placeholder="production.completed"
                            />
                        </label>
                        <label>
                            Clave de idempotencia
                            <input
                                required
                                value={messageForm.data.idempotency_key}
                                onChange={(event) =>
                                    messageForm.setData(
                                        'idempotency_key',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Correlación
                            <input
                                value={messageForm.data.correlation_id}
                                onChange={(event) =>
                                    messageForm.setData(
                                        'correlation_id',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Entidad
                            <input
                                value={messageForm.data.entity_type}
                                onChange={(event) =>
                                    messageForm.setData(
                                        'entity_type',
                                        event.target.value,
                                    )
                                }
                                placeholder="production_order"
                            />
                        </label>
                        <label>
                            ID de entidad
                            <input
                                value={messageForm.data.entity_id}
                                onChange={(event) =>
                                    messageForm.setData(
                                        'entity_id',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <label>
                        Payload JSON
                        <textarea
                            required
                            rows={9}
                            spellCheck={false}
                            value={messageForm.data.payload_json}
                            onChange={(event) =>
                                messageForm.setData(
                                    'payload_json',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <ErrorMessage errors={messageForm.errors} />
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={messageForm.processing}
                        >
                            {dialog === 'inbound' ? (
                                <MessageSquareMore />
                            ) : (
                                <Send />
                            )}
                            Registrar mensaje
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'reconcile'}
                onOpenChange={(isOpen) => !isOpen && close()}
                title="Conciliar mensajes"
                description="Compara el conteo esperado contra mensajes observados, reconocidos y fallidos."
            >
                <form className="mes-form" onSubmit={submitReconciliation}>
                    <label>
                        Endpoint
                        <select
                            required
                            value={reconcileForm.data.integration_endpoint_id}
                            onChange={(event) =>
                                reconcileForm.setData(
                                    'integration_endpoint_id',
                                    event.target.value,
                                )
                            }
                        >
                            <option value="">Selecciona…</option>
                            {activeEndpoints.map((endpoint) => (
                                <option
                                    key={value(endpoint.id)}
                                    value={value(endpoint.id)}
                                >
                                    {value(endpoint.code)} ·{' '}
                                    {value(endpoint.name)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <div className="form-grid">
                        <label>
                            Desde
                            <input
                                required
                                type="datetime-local"
                                value={reconcileForm.data.period_from}
                                onChange={(event) =>
                                    reconcileForm.setData(
                                        'period_from',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Hasta
                            <input
                                required
                                type="datetime-local"
                                value={reconcileForm.data.period_to}
                                onChange={(event) =>
                                    reconcileForm.setData(
                                        'period_to',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Conteo esperado
                            <input
                                required
                                type="number"
                                min="0"
                                value={reconcileForm.data.expected_count}
                                onChange={(event) =>
                                    reconcileForm.setData(
                                        'expected_count',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <label>
                        Notas
                        <textarea
                            value={reconcileForm.data.notes}
                            onChange={(event) =>
                                reconcileForm.setData(
                                    'notes',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <ErrorMessage errors={reconcileForm.errors} />
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={reconcileForm.processing}
                        >
                            <Activity /> Generar conciliación
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}
