import { FormEvent, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    AlertTriangle,
    CheckCircle2,
    DatabaseBackup,
    GitMerge,
    Plus,
    Scale,
    Scissors,
    ShieldCheck,
} from 'lucide-react';
import { MesRecordDialog } from '@/components/mes-record-dialog';

type Item = Record<string, unknown>;
type Props = Record<string, unknown>;
const textValue = (value: unknown, fallback = '—'): string => {
    if (value === null || value === undefined) return fallback;
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    )
        return String(value);
    return JSON.stringify(value);
};

function Card({
    title,
    children,
    action,
}: {
    title: string;
    children: React.ReactNode;
    action?: React.ReactNode;
}) {
    return (
        <section className="mes-card">
            <header>
                <h2>{title}</h2>
                {action}
            </header>
            {children}
        </section>
    );
}
function Grid({ children }: { children: React.ReactNode }) {
    return <div className="form-grid">{children}</div>;
}
function Status({ value }: { value: unknown }) {
    const text = textValue(value);
    return (
        <span
            className={`status-pill status-${text.toLowerCase().replaceAll('_', '-')}`}
        >
            {text}
        </span>
    );
}
function Table({
    headers,
    rows,
}: {
    headers: string[];
    rows: React.ReactNode[][];
}) {
    return (
        <div className="table-shell">
            <table>
                <thead>
                    <tr>
                        {headers.map((h) => (
                            <th key={h}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r, i) => (
                        <tr key={i}>
                            {r.map((c, j) => (
                                <td
                                    className={j === 0 ? 'code-cell' : ''}
                                    key={j}
                                >
                                    {c}
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
const dt = (v: unknown) =>
    v ? new Date(textValue(v)).toLocaleString('es-MX') : '—';

export function OrdersSection({ data }: { data: Props }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        part_id: '',
        planned_quantity: '',
        priority: 'NORMAL',
        scheduled_start: '',
        scheduled_end: '',
        notes: '',
    });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/mes/orders', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    };
    const orders = (data.orders ?? []) as Item[];
    return (
        <div className="stack-lg">
            <Card
                title="Plan de producción"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setOpen(true)}
                    >
                        <Plus /> Nueva orden
                    </button>
                }
            >
                <div className="order-grid">
                    {orders.map((o) => {
                        const part = o.part as Item;
                        const operations = (o.operations ?? []) as Item[];
                        const next =
                            o.status === 'PLANNED'
                                ? 'RELEASED'
                                : o.status === 'RELEASED'
                                  ? 'IN_PROGRESS'
                                  : o.status === 'IN_PROGRESS'
                                    ? 'COMPLETED'
                                    : null;
                        return (
                            <article className="order-card" key={String(o.id)}>
                                <div>
                                    <span className="eyebrow">
                                        {String(o.priority)}
                                    </span>
                                    <h3>{String(o.number)}</h3>
                                    <p>
                                        {String(part?.code)} ·{' '}
                                        {String(o.planned_quantity)}{' '}
                                        {String(o.unit)}
                                    </p>
                                </div>
                                <Status value={o.status} />
                                <div className="order-progress">
                                    <span>
                                        {
                                            operations.filter(
                                                (x) => x.status === 'COMPLETED',
                                            ).length
                                        }
                                        /{operations.length} operaciones
                                    </span>
                                    <progress
                                        value={
                                            operations.filter(
                                                (x) => x.status === 'COMPLETED',
                                            ).length
                                        }
                                        max={operations.length || 1}
                                    />
                                </div>
                                <small>{dt(o.scheduled_start)}</small>
                                {next && (
                                    <button
                                        className="small-button"
                                        onClick={() =>
                                            router.patch(
                                                `/mes/orders/${String(o.id)}/status`,
                                                {
                                                    status: next,
                                                    reason: `Transición operativa a ${next}`,
                                                },
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        {next === 'RELEASED'
                                            ? 'Liberar'
                                            : next === 'IN_PROGRESS'
                                              ? 'Iniciar'
                                              : 'Cerrar'}
                                    </button>
                                )}
                            </article>
                        );
                    })}
                </div>
            </Card>
            <MesRecordDialog
                open={open}
                onOpenChange={setOpen}
                title="Nueva orden de producción"
                description="Programa el producto, cantidad y ventana de ejecución. La ruta e insumos se generarán automáticamente."
            >
                <form className="mes-form" onSubmit={submit}>
                    <Grid>
                        <label>
                            Producto con ruta aprobada
                            <select
                                required
                                value={form.data.part_id}
                                onChange={(e) =>
                                    form.setData('part_id', e.target.value)
                                }
                            >
                                <option value="">Seleccionar</option>
                                {((data.parts ?? []) as Item[]).map((p) => (
                                    <option
                                        key={String(p.id)}
                                        value={String(p.id)}
                                    >
                                        {String(p.code)} ·{' '}
                                        {String(p.description)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Cantidad
                            <input
                                required
                                type="number"
                                min="0.0001"
                                step="any"
                                value={form.data.planned_quantity}
                                onChange={(e) =>
                                    form.setData(
                                        'planned_quantity',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Prioridad
                            <select
                                value={form.data.priority}
                                onChange={(e) =>
                                    form.setData('priority', e.target.value)
                                }
                            >
                                <option value="LOW">Baja</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">Alta</option>
                                <option value="CRITICAL">Crítica</option>
                            </select>
                        </label>
                        <label>
                            Inicio programado
                            <input
                                required
                                type="datetime-local"
                                value={form.data.scheduled_start}
                                onChange={(e) =>
                                    form.setData(
                                        'scheduled_start',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Fin programado
                            <input
                                type="datetime-local"
                                value={form.data.scheduled_end}
                                onChange={(e) =>
                                    form.setData(
                                        'scheduled_end',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Notas
                            <input
                                value={form.data.notes}
                                onChange={(e) =>
                                    form.setData('notes', e.target.value)
                                }
                            />
                        </label>
                    </Grid>
                    {Object.keys(form.errors).length > 0 && (
                        <p className="form-error">
                            {Object.values(form.errors).join(' ')}
                        </p>
                    )}
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={form.processing}
                        >
                            Crear orden y ruta
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}

export function TraceSection({ data }: { data: Props }) {
    const containers = (data.containers ?? []) as Item[];
    const split = useForm({ pieces: '2', quantity_each: '', reason: '' });
    const merge = useForm({ container_ids: [] as string[], reason: '' });
    const [source, setSource] = useState('');
    const [splitOpen, setSplitOpen] = useState(false);
    const [mergeOpen, setMergeOpen] = useState(false);
    return (
        <div className="stack-lg">
            <div className="record-actions">
                <button
                    className="primary-button"
                    onClick={() => setSplitOpen(true)}
                >
                    <Scissors /> Dividir contenedor
                </button>
                <button
                    className="secondary-button"
                    onClick={() => setMergeOpen(true)}
                >
                    <GitMerge /> Fusionar contenedores
                </button>
            </div>
            <MesRecordDialog
                open={splitOpen}
                onOpenChange={setSplitOpen}
                title="Dividir contenedor"
                description="Genera nuevos seriales y conserva la genealogía completa del material."
            >
                <form
                    className="mes-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        split.post(`/mes/trace/${source}/split`, {
                            preserveScroll: true,
                            onSuccess: () => {
                                split.reset();
                                setSource('');
                                setSplitOpen(false);
                            },
                        });
                    }}
                >
                    <Grid>
                        <label>
                            Fuente
                            <select
                                required
                                value={source}
                                onChange={(e) => setSource(e.target.value)}
                            >
                                <option value="">Seleccionar</option>
                                {containers.map((c) => (
                                    <option
                                        key={String(c.id)}
                                        value={String(c.id)}
                                    >
                                        {String(c.serial)} ·{' '}
                                        {String(c.quantity_current)}{' '}
                                        {String(c.unit)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Número de salidas
                            <input
                                type="number"
                                min="2"
                                max="20"
                                value={split.data.pieces}
                                onChange={(e) =>
                                    split.setData('pieces', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Cantidad por salida
                            <input
                                required
                                type="number"
                                step="any"
                                min="0.0001"
                                value={split.data.quantity_each}
                                onChange={(e) =>
                                    split.setData(
                                        'quantity_each',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Razón
                            <input
                                required
                                minLength={5}
                                value={split.data.reason}
                                onChange={(e) =>
                                    split.setData('reason', e.target.value)
                                }
                            />
                        </label>
                    </Grid>
                    <div className="form-actions">
                        <button className="primary-button">
                            Dividir y trazar
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
            <MesRecordDialog
                open={mergeOpen}
                onOpenChange={setMergeOpen}
                title="Fusionar contenedores"
                description="Combina fuentes compatibles en un nuevo contenedor trazable."
            >
                <form
                    className="mes-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        merge.post('/mes/trace/merge', {
                            preserveScroll: true,
                            onSuccess: () => {
                                merge.reset();
                                setMergeOpen(false);
                            },
                        });
                    }}
                >
                    <label>
                        Fuentes compatibles
                        <select
                            multiple
                            required
                            value={merge.data.container_ids}
                            onChange={(e) =>
                                merge.setData(
                                    'container_ids',
                                    Array.from(e.target.selectedOptions).map(
                                        (x) => x.value,
                                    ),
                                )
                            }
                        >
                            {containers.map((c) => (
                                <option key={String(c.id)} value={String(c.id)}>
                                    {String(c.serial)} ·{' '}
                                    {String((c.part as Item)?.code)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Razón
                        <input
                            required
                            minLength={5}
                            value={merge.data.reason}
                            onChange={(e) =>
                                merge.setData('reason', e.target.value)
                            }
                        />
                    </label>
                    <div className="form-actions">
                        <button className="primary-button">
                            Fusionar y trazar
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
            <Card title="Historial de genealogía">
                <Table
                    headers={[
                        'Fecha',
                        'Grupo',
                        'Padre',
                        'Hijo',
                        'Acción',
                        'Orden',
                        'Cantidad',
                        'Razón',
                    ]}
                    rows={((data.events ?? []) as Item[]).map((x) => [
                        dt(x.occurred_at),
                        textValue(x.event_group).slice(0, 8),
                        textValue(x.parent, 'Origen'),
                        String(x.child),
                        <Status value={x.action} />,
                        textValue(x.production_order),
                        `${textValue(x.quantity)} ${textValue(x.unit, '')}`,
                        textValue(x.reason),
                    ])}
                />
            </Card>
        </div>
    );
}

export function QualitySection({ data }: { data: Props }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        quality_specification_id: '',
        container_id: '',
        production_order_id: '',
        supplier_lot: '',
        result_value: '',
        notes: '',
    });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/mes/quality/inspections', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    };
    return (
        <div className="stack-lg">
            <Card
                title="Inspecciones y cuarentenas"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setOpen(true)}
                    >
                        <Plus /> Nueva inspección
                    </button>
                }
            >
                <Table
                    headers={[
                        'Inspección',
                        'Fecha',
                        'Especificación',
                        'Objeto',
                        'Resultado',
                        'Estatus',
                        'Disposición',
                        'Acción',
                    ]}
                    rows={((data.qualityInspections ?? []) as Item[]).map(
                        (x) => [
                            String(x.number),
                            dt(x.occurred_at),
                            String(x.specification),
                            textValue(x.container ?? x.production_order),
                            `${String(x.result_value)} ${textValue(x.unit, '')}`,
                            <Status value={x.status} />,
                            <Status value={x.disposition} />,
                            x.disposition === 'HOLD' ? (
                                <span className="inline-actions">
                                    <button
                                        onClick={() =>
                                            router.patch(
                                                `/mes/quality/inspections/${String(x.id)}/disposition`,
                                                {
                                                    disposition: 'RELEASE',
                                                    reason: 'Liberación documentada por supervisor',
                                                },
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        Liberar
                                    </button>
                                    <button
                                        onClick={() =>
                                            router.patch(
                                                `/mes/quality/inspections/${String(x.id)}/disposition`,
                                                {
                                                    disposition: 'REJECT',
                                                    reason: 'Rechazo documentado por supervisor',
                                                },
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        Rechazar
                                    </button>
                                </span>
                            ) : (
                                '—'
                            ),
                        ],
                    )}
                />
            </Card>
            <MesRecordDialog
                open={open}
                onOpenChange={setOpen}
                title="Registrar inspección"
                description="Captura el resultado contra una especificación y aplica automáticamente la disposición de calidad."
            >
                <form className="mes-form" onSubmit={submit}>
                    <Grid>
                        <label>
                            Especificación
                            <select
                                required
                                value={form.data.quality_specification_id}
                                onChange={(e) =>
                                    form.setData(
                                        'quality_specification_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccionar</option>
                                {(
                                    (data.qualitySpecifications ?? []) as Item[]
                                ).map((x) => (
                                    <option
                                        key={String(x.id)}
                                        value={String(x.id)}
                                    >
                                        {String(x.code)} ·{' '}
                                        {String(x.characteristic)} [
                                        {textValue(x.min_value)}–
                                        {textValue(x.max_value)}{' '}
                                        {String(x.unit)}]
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Contenedor
                            <select
                                value={form.data.container_id}
                                onChange={(e) =>
                                    form.setData('container_id', e.target.value)
                                }
                            >
                                <option value="">Sin contenedor</option>
                                {((data.containers ?? []) as Item[]).map(
                                    (x) => (
                                        <option
                                            key={String(x.id)}
                                            value={String(x.id)}
                                        >
                                            {String(x.serial)} ·{' '}
                                            {String((x.part as Item)?.code)}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label>
                            Resultado
                            <input
                                required
                                type="number"
                                step="any"
                                value={form.data.result_value}
                                onChange={(e) =>
                                    form.setData('result_value', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Lote proveedor
                            <input
                                value={form.data.supplier_lot}
                                onChange={(e) =>
                                    form.setData('supplier_lot', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Notas
                            <input
                                value={form.data.notes}
                                onChange={(e) =>
                                    form.setData('notes', e.target.value)
                                }
                            />
                        </label>
                    </Grid>
                    <div className="form-actions">
                        <button className="primary-button">
                            Evaluar y disponer
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}

export function EnvironmentSection({ data }: { data: Props }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        environmental_limit_id: '',
        location_id: '',
        value: '',
        source: 'MANUAL',
        evidence: '',
    });
    return (
        <div className="stack-lg">
            <Card
                title="Serie y alarmas"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setOpen(true)}
                    >
                        <Plus /> Nueva lectura
                    </button>
                }
            >
                <Table
                    headers={[
                        'Fecha',
                        'Etapa',
                        'Parámetro',
                        'Lectura',
                        'Rango',
                        'Ubicación',
                        'Fuente',
                        'Alarma',
                        'Acción',
                    ]}
                    rows={((data.environmentalReadings ?? []) as Item[]).map(
                        (x) => [
                            dt(x.recorded_at),
                            String(x.stage),
                            String(x.parameter),
                            `${String(x.value)} ${String(x.unit)}`,
                            `${String(x.min_value)}–${String(x.max_value)}`,
                            String(x.location),
                            String(x.source),
                            <Status value={x.alarm_status} />,
                            x.alarm_status === 'OPEN' ? (
                                <button
                                    className="small-button"
                                    onClick={() =>
                                        router.patch(
                                            `/mes/environment/readings/${String(x.id)}/acknowledge`,
                                            {
                                                reason: 'Condición revisada y acción inmediata documentada',
                                            },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    Reconocer
                                </button>
                            ) : (
                                '—'
                            ),
                        ],
                    )}
                />
            </Card>
            <MesRecordDialog
                open={open}
                onOpenChange={setOpen}
                title="Captura ambiental"
                description="Registra una lectura de proceso y genera una alarma si queda fuera de los límites establecidos."
            >
                <form
                    className="mes-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/mes/environment/readings', {
                            preserveScroll: true,
                            onSuccess: () => {
                                form.reset('value', 'evidence');
                                setOpen(false);
                            },
                        });
                    }}
                >
                    <Grid>
                        <label>
                            Límite
                            <select
                                required
                                value={form.data.environmental_limit_id}
                                onChange={(e) =>
                                    form.setData(
                                        'environmental_limit_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccionar</option>
                                {(
                                    (data.environmentalLimits ?? []) as Item[]
                                ).map((x) => (
                                    <option
                                        key={String(x.id)}
                                        value={String(x.id)}
                                    >
                                        {String(x.stage)} ·{' '}
                                        {String(x.parameter)} [
                                        {String(x.min_value)}–
                                        {String(x.max_value)} {String(x.unit)}]
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Ubicación
                            <select
                                required
                                value={form.data.location_id}
                                onChange={(e) =>
                                    form.setData('location_id', e.target.value)
                                }
                            >
                                <option value="">Seleccionar</option>
                                {((data.locations ?? []) as Item[]).map((x) => (
                                    <option
                                        key={String(x.id)}
                                        value={String(x.id)}
                                    >
                                        {String(x.code)} ·{' '}
                                        {String(x.description)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Lectura
                            <input
                                required
                                type="number"
                                step="any"
                                value={form.data.value}
                                onChange={(e) =>
                                    form.setData('value', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Fuente
                            <select
                                value={form.data.source}
                                onChange={(e) =>
                                    form.setData('source', e.target.value)
                                }
                            >
                                <option>MANUAL</option>
                                <option>SENSOR</option>
                            </select>
                        </label>
                        <label>
                            Evidencia
                            <input
                                value={form.data.evidence}
                                onChange={(e) =>
                                    form.setData('evidence', e.target.value)
                                }
                            />
                        </label>
                    </Grid>
                    <div className="form-actions">
                        <button className="primary-button">
                            Registrar lectura
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}

export function BiosecuritySection({ data }: { data: Props }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        type: 'CLEANING',
        location_id: '',
        severity: 'LOW',
        observation: '',
        immediate_action: '',
    });
    return (
        <div className="stack-lg">
            <Card
                title="Registro sanitario"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setOpen(true)}
                    >
                        <Plus /> Nuevo evento
                    </button>
                }
            >
                <Table
                    headers={[
                        'Evento',
                        'Fecha',
                        'Tipo',
                        'Ubicación',
                        'Severidad',
                        'Estado',
                        'Observación',
                        'Acción',
                    ]}
                    rows={((data.biosecurityEvents ?? []) as Item[]).map(
                        (x) => [
                            String(x.number),
                            dt(x.occurred_at),
                            String(x.type),
                            textValue(x.location, 'General'),
                            <Status value={x.severity} />,
                            <Status value={x.status} />,
                            String(x.observation),
                            x.status === 'OPEN' ? (
                                <button
                                    className="small-button"
                                    onClick={() =>
                                        router.patch(
                                            `/mes/biosecurity/events/${String(x.id)}/close`,
                                            {
                                                corrective_action:
                                                    'Acción correctiva ejecutada y verificada por el responsable',
                                            },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    Cerrar
                                </button>
                            ) : (
                                textValue(x.corrective_action)
                            ),
                        ],
                    )}
                />
            </Card>
            <MesRecordDialog
                open={open}
                onOpenChange={setOpen}
                title="Nuevo evento de bioseguridad"
                description="Documenta el hallazgo, su severidad y la acción inmediata para seguimiento sanitario."
            >
                <form
                    className="mes-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/mes/biosecurity/events', {
                            preserveScroll: true,
                            onSuccess: () => {
                                form.reset('observation', 'immediate_action');
                                setOpen(false);
                            },
                        });
                    }}
                >
                    <Grid>
                        <label>
                            Tipo
                            <select
                                value={form.data.type}
                                onChange={(e) =>
                                    form.setData('type', e.target.value)
                                }
                            >
                                {[
                                    'CLEANING',
                                    'PEST',
                                    'VISITOR',
                                    'MORTALITY',
                                    'SANITARY',
                                    'BARRIER',
                                ].map((x) => (
                                    <option key={x}>{x}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Ubicación
                            <select
                                value={form.data.location_id}
                                onChange={(e) =>
                                    form.setData('location_id', e.target.value)
                                }
                            >
                                <option value="">General</option>
                                {((data.locations ?? []) as Item[]).map((x) => (
                                    <option
                                        key={String(x.id)}
                                        value={String(x.id)}
                                    >
                                        {String(x.code)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Severidad
                            <select
                                value={form.data.severity}
                                onChange={(e) =>
                                    form.setData('severity', e.target.value)
                                }
                            >
                                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(
                                    (x) => (
                                        <option key={x}>{x}</option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label>
                            Observación
                            <textarea
                                required
                                minLength={5}
                                value={form.data.observation}
                                onChange={(e) =>
                                    form.setData('observation', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Acción inmediata
                            <textarea
                                value={form.data.immediate_action}
                                onChange={(e) =>
                                    form.setData(
                                        'immediate_action',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                    </Grid>
                    <div className="form-actions">
                        <button className="primary-button">Abrir evento</button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}

function BalanceForm({ order }: { order: Item }) {
    const [open, setOpen] = useState(false);
    const form = useForm({
        substrate_input: '0',
        water_input: '0',
        biomass_input: '0',
        larvae_output: '0',
        frass_output: '0',
        coproduct_output: '0',
        evaporation: '0',
        waste: '0',
        tolerance_percent: '5',
        notes: '',
    });
    const balance = order.mass_balance as Item | null;
    return (
        <article className="balance-card">
            <header>
                <div>
                    <span className="eyebrow">{String(order.number)}</span>
                    <h3>{String((order.part as Item)?.description)}</h3>
                </div>
                {balance && <Status value={balance.status} />}
            </header>
            {balance ? (
                <div className="balance-summary">
                    <span>Desviación</span>
                    <strong>{String(balance.variance_percent)}%</strong>
                </div>
            ) : (
                <p>Balance pendiente de captura y conciliación.</p>
            )}
            <button className="secondary-button" onClick={() => setOpen(true)}>
                <Scale /> {balance ? 'Actualizar balance' : 'Registrar balance'}
            </button>
            <MesRecordDialog
                open={open}
                onOpenChange={setOpen}
                title={`Balance de masa · ${String(order.number)}`}
                description="Concilia todas las entradas y salidas del lote antes de su cierre."
            >
                <form
                    className="mes-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post(`/mes/mass-balance/${String(order.id)}`, {
                            preserveScroll: true,
                            onSuccess: () => setOpen(false),
                        });
                    }}
                >
                    <Grid>
                        {Object.entries({
                            substrate_input: 'Sustrato',
                            water_input: 'Agua',
                            biomass_input: 'Biomasa inicial',
                            larvae_output: 'Larva',
                            frass_output: 'Frass',
                            coproduct_output: 'Coproducto',
                            evaporation: 'Evaporación',
                            waste: 'Residuo',
                            tolerance_percent: 'Tolerancia %',
                        }).map(([key, label]) => (
                            <label key={key}>
                                {label}
                                <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={String(
                                        form.data[
                                            key as keyof typeof form.data
                                        ],
                                    )}
                                    onChange={(e) =>
                                        form.setData(
                                            key as keyof typeof form.data,
                                            e.target.value,
                                        )
                                    }
                                />
                            </label>
                        ))}
                    </Grid>
                    <div className="form-actions">
                        <button className="primary-button">
                            Calcular y cerrar
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </article>
    );
}
export function MassBalanceSection({ data }: { data: Props }) {
    return (
        <div className="balance-grid">
            {((data.orders ?? []) as Item[]).map((x) => (
                <BalanceForm key={String(x.id)} order={x} />
            ))}
        </div>
    );
}

export function AuditSection({ data }: { data: Props }) {
    return (
        <Card title="Bitácora inmutable">
            <Table
                headers={[
                    'Fecha',
                    'Usuario',
                    'Evento',
                    'Entidad',
                    'ID',
                    'Razón',
                    'IP',
                ]}
                rows={((data.auditEvents ?? []) as Item[]).map((x) => [
                    dt(x.occurred_at),
                    textValue(x.user, 'Sistema'),
                    String(x.event),
                    String(x.auditable_type).split('\\').pop() ?? '—',
                    textValue(x.auditable_id),
                    String(x.reason),
                    textValue(x.ip_address),
                ])}
            />
        </Card>
    );
}

export function ContinuitySection({ data }: { data: Props }) {
    return (
        <div className="stack-lg">
            <div className="readiness-grid">
                <article>
                    <DatabaseBackup />
                    <span>Base de datos</span>
                    <strong>{String(data.database)}</strong>
                </article>
                <article>
                    <CheckCircle2 />
                    <span>Programación</span>
                    <strong>{String(data.schedule)}</strong>
                </article>
                <article>
                    <ShieldCheck />
                    <span>Retención</span>
                    <strong>{String(data.retention)}</strong>
                </article>
            </div>
            <Card
                title="Respaldo y verificación"
                action={
                    <button
                        className="primary-button"
                        onClick={() =>
                            router.post(
                                '/mes/continuity/backup',
                                {},
                                { preserveScroll: true },
                            )
                        }
                    >
                        <DatabaseBackup /> Ejecutar ahora
                    </button>
                }
            >
                <Table
                    headers={[
                        'Inicio',
                        'Estado',
                        'Archivo',
                        'Tamaño',
                        'Checksum',
                        'Restaurable',
                    ]}
                    rows={((data.backupRuns ?? []) as Item[]).map((x) => [
                        dt(x.started_at),
                        <Status value={x.status} />,
                        textValue(x.path).split(/[\\/]/).pop() ?? '—',
                        x.size_bytes
                            ? `${(Number(x.size_bytes) / 1024).toFixed(1)} KB`
                            : '—',
                        textValue(x.checksum).slice(0, 12),
                        x.restore_verified ? 'Sí' : 'No',
                    ])}
                />
            </Card>
            <p className="info-callout">
                <AlertTriangle /> SQLite cuenta con respaldo consistente local.
                Alta disponibilidad, copia fuera del equipo y simulacro formal
                siguen siendo tareas de infraestructura.
            </p>
        </div>
    );
}

export function GovernanceSection({ data }: { data: Props }) {
    return (
        <div className="stack-lg">
            <div className="info-callout">
                <ShieldCheck />
                <div>
                    <b>Aprobaciones de Fase 0 completadas</b>
                    <p>
                        Los entregables están versionados en docs/phase-0. El
                        expediente permanece en verificación documental hasta
                        vincular nombre, cargo, versión, fecha y evidencia de
                        Operaciones, Calidad, Bioseguridad, TI y Dirección. No
                        se requieren nuevas aprobaciones.
                    </p>
                </div>
            </div>
            <Card title="Entregables para aprobación">
                <Table
                    headers={['Código', 'Documento', 'Archivo', 'Estado']}
                    rows={((data.documents ?? []) as Item[]).map((x) => [
                        String(x.code),
                        String(x.name),
                        String(x.file),
                        <Status value={x.status} />,
                    ])}
                />
            </Card>
        </div>
    );
}
