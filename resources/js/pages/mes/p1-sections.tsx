import { type FormEvent, useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    BadgeCheck,
    CircleGauge,
    ClipboardPlus,
    Plus,
    QrCode,
    ShieldCheck,
    Utensils,
    Wrench,
} from 'lucide-react';
import { MesRecordDialog } from '@/components/mes-record-dialog';

type Item = Record<string, unknown>;
type Props = Record<string, unknown>;

const value = (input: unknown, fallback = '—'): string => {
    if (input === null || input === undefined) return fallback;
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

function Status({ value: input }: { value: unknown }) {
    const text = value(input);
    return (
        <span
            className={`status-pill status-${text.toLowerCase().replaceAll('_', '-')}`}
        >
            {text}
        </span>
    );
}

function Card({
    title,
    action,
    children,
}: {
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
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
                        {headers.map((header) => (
                            <th key={header}>{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={index}>
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

function Metric({
    icon: Icon,
    label,
    metric,
    detail,
}: {
    icon: typeof Wrench;
    label: string;
    metric: string | number;
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

export function FeedingSection({ data }: { data: Props }) {
    const [open, setOpen] = useState(false);
    const [targetScan, setTargetScan] = useState('');
    const [substrateScan, setSubstrateScan] = useState('');
    const targets = (data.targetContainers ?? []) as Item[];
    const substrates = (data.substrateContainers ?? []) as Item[];
    const events = (data.feedingEvents ?? []) as Item[];
    const form = useForm({
        production_order_id: '',
        target_container_id: '',
        substrate_container_id: '',
        quantity: '',
        dry_matter_percent: '',
        notes: '',
    });
    const scan = (
        serial: string,
        items: Item[],
        field: 'target_container_id' | 'substrate_container_id',
    ) => {
        const match = items.find(
            (item) =>
                value(item.serial).toLowerCase() ===
                serial.trim().toLowerCase(),
        );
        if (match) form.setData(field, value(match.id, ''));
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/mes/feeding', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setTargetScan('');
                setSubstrateScan('');
                setOpen(false);
            },
        });
    };

    const total = events.reduce(
        (sum, item) => sum + Number(item.quantity ?? 0),
        0,
    );
    return (
        <div className="stack-lg">
            <div className="phase-metrics">
                <Metric
                    icon={Utensils}
                    label="Eventos"
                    metric={events.length}
                    detail="Alimentaciones trazadas"
                />
                <Metric
                    icon={CircleGauge}
                    label="Consumo registrado"
                    metric={total.toLocaleString('es-MX')}
                    detail="Unidades según lote de sustrato"
                />
                <Metric
                    icon={QrCode}
                    label="Captura"
                    metric="Serial"
                    detail="Compatible con lector USB"
                />
            </div>
            <Card
                title="Historial de alimentación"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setOpen(true)}
                    >
                        <Plus /> Registrar alimentación
                    </button>
                }
            >
                <Table
                    headers={[
                        'Fecha',
                        'Larvero',
                        'Sustrato',
                        'Cantidad',
                        'Materia seca',
                        'Orden',
                        'Operador',
                        'Notas',
                    ]}
                    rows={events.map((item) => [
                        date(item.occurred_at),
                        value(item.target),
                        value(item.substrate),
                        `${value(item.quantity)} ${value(item.unit, '')}`,
                        item.dry_matter_percent
                            ? `${value(item.dry_matter_percent)}%`
                            : '—',
                        value(item.production_order),
                        value(item.operator),
                        value(item.notes),
                    ])}
                />
            </Card>
            <MesRecordDialog
                open={open}
                onOpenChange={setOpen}
                title="Registrar alimentación"
                description="Relaciona larvero, lote de sustrato y orden; el consumo se descuenta automáticamente del inventario."
            >
                <form className="mes-form" onSubmit={submit}>
                    <div className="form-grid">
                        <label>
                            Escanear larvero
                            <span className="scan-input">
                                <QrCode />
                                <input
                                    placeholder="Escanea o escribe el serial"
                                    value={targetScan}
                                    onChange={(event) => {
                                        setTargetScan(event.target.value);
                                        scan(
                                            event.target.value,
                                            targets,
                                            'target_container_id',
                                        );
                                    }}
                                />
                            </span>
                        </label>
                        <label>
                            Larvero destino
                            <select
                                required
                                value={form.data.target_container_id}
                                onChange={(event) =>
                                    form.setData(
                                        'target_container_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccionar</option>
                                {targets.map((item) => (
                                    <option
                                        key={value(item.id)}
                                        value={value(item.id)}
                                    >
                                        {value(item.serial)} ·{' '}
                                        {value(
                                            (item.part as Item)?.description,
                                        )}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Escanear sustrato
                            <span className="scan-input">
                                <QrCode />
                                <input
                                    placeholder="Escanea o escribe el serial"
                                    value={substrateScan}
                                    onChange={(event) => {
                                        setSubstrateScan(event.target.value);
                                        scan(
                                            event.target.value,
                                            substrates,
                                            'substrate_container_id',
                                        );
                                    }}
                                />
                            </span>
                        </label>
                        <label>
                            Lote de sustrato
                            <select
                                required
                                value={form.data.substrate_container_id}
                                onChange={(event) =>
                                    form.setData(
                                        'substrate_container_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccionar</option>
                                {substrates.map((item) => (
                                    <option
                                        key={value(item.id)}
                                        value={value(item.id)}
                                    >
                                        {value(item.serial)} ·{' '}
                                        {value(item.quantity_current)}{' '}
                                        {value(item.unit, '')}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Orden de producción
                            <select
                                value={form.data.production_order_id}
                                onChange={(event) =>
                                    form.setData(
                                        'production_order_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Sin orden</option>
                                {((data.orders ?? []) as Item[]).map((item) => (
                                    <option
                                        key={value(item.id)}
                                        value={value(item.id)}
                                    >
                                        {value(item.number)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Cantidad suministrada
                            <input
                                required
                                type="number"
                                min="0.0001"
                                step="any"
                                value={form.data.quantity}
                                onChange={(event) =>
                                    form.setData('quantity', event.target.value)
                                }
                            />
                        </label>
                        <label>
                            Materia seca %
                            <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={form.data.dry_matter_percent}
                                onChange={(event) =>
                                    form.setData(
                                        'dry_matter_percent',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Notas
                            <input
                                value={form.data.notes}
                                onChange={(event) =>
                                    form.setData('notes', event.target.value)
                                }
                            />
                        </label>
                    </div>
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={form.processing}
                        >
                            Guardar y descontar
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}

export function AdvancedQualitySection({ data }: { data: Props }) {
    const [createOpen, setCreateOpen] = useState(false);
    const [closing, setClosing] = useState<Item | null>(null);
    const deviations = (data.qualityDeviations ?? []) as Item[];
    const actions = (data.correctiveActions ?? []) as Item[];
    const create = useForm({
        production_order_id: '',
        container_id: '',
        source: 'PROCESS',
        severity: 'MEDIUM',
        title: '',
        description: '',
        immediate_action: '',
        root_cause: '',
        corrective_action: '',
        preventive_action: '',
        due_at: '',
    });
    const close = useForm({
        root_cause: '',
        disposition: '',
        effectiveness_result: '',
    });

    return (
        <div className="stack-lg">
            <Card
                title="Desviaciones y CAPA"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setCreateOpen(true)}
                    >
                        <ClipboardPlus /> Nueva desviación
                    </button>
                }
            >
                <Table
                    headers={[
                        'Número',
                        'Origen',
                        'Hallazgo',
                        'Severidad',
                        'Estado',
                        'Objeto',
                        'Vencimiento',
                        'Acción',
                    ]}
                    rows={deviations.map((item) => [
                        value(item.number),
                        value(item.source),
                        value(item.title),
                        <Status value={item.severity} />,
                        <Status value={item.status} />,
                        value(item.container ?? item.production_order),
                        value(item.due_at),
                        item.status !== 'CLOSED' ? (
                            <button
                                className="small-button"
                                onClick={() => setClosing(item)}
                            >
                                <ShieldCheck /> Verificar y cerrar
                            </button>
                        ) : (
                            value(item.disposition)
                        ),
                    ])}
                />
            </Card>
            <Card title="Plan de acciones correctivas y preventivas">
                <Table
                    headers={[
                        'Desviación',
                        'Tipo',
                        'Acción',
                        'Responsable',
                        'Vencimiento',
                        'Estado',
                        'Efectividad',
                    ]}
                    rows={actions.map((item) => [
                        value(item.deviation),
                        value(item.type),
                        value(item.description),
                        value(item.owner),
                        value(item.due_at),
                        <Status value={item.status} />,
                        value(item.effectiveness_result),
                    ])}
                />
            </Card>
            <MesRecordDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                title="Nueva desviación"
                description="Documenta el hallazgo, contención y acciones CAPA con responsable y fecha objetivo."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        create.post('/mes/quality/deviations', {
                            preserveScroll: true,
                            onSuccess: () => {
                                create.reset();
                                setCreateOpen(false);
                            },
                        });
                    }}
                >
                    <div className="form-grid">
                        <label>
                            Origen
                            <select
                                value={create.data.source}
                                onChange={(event) =>
                                    create.setData('source', event.target.value)
                                }
                            >
                                {[
                                    'QUALITY',
                                    'PROCESS',
                                    'ENVIRONMENT',
                                    'BIOSECURITY',
                                    'SUPPLIER',
                                    'CUSTOMER',
                                ].map((item) => (
                                    <option key={item}>{item}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Severidad
                            <select
                                value={create.data.severity}
                                onChange={(event) =>
                                    create.setData(
                                        'severity',
                                        event.target.value,
                                    )
                                }
                            >
                                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(
                                    (item) => (
                                        <option key={item}>{item}</option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label>
                            Orden
                            <select
                                value={create.data.production_order_id}
                                onChange={(event) =>
                                    create.setData(
                                        'production_order_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Sin orden</option>
                                {((data.orders ?? []) as Item[]).map((item) => (
                                    <option
                                        value={value(item.id)}
                                        key={value(item.id)}
                                    >
                                        {value(item.number)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Contenedor
                            <select
                                value={create.data.container_id}
                                onChange={(event) =>
                                    create.setData(
                                        'container_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Sin contenedor</option>
                                {((data.containers ?? []) as Item[]).map(
                                    (item) => (
                                        <option
                                            value={value(item.id)}
                                            key={value(item.id)}
                                        >
                                            {value(item.serial)}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label>
                            Título
                            <input
                                required
                                value={create.data.title}
                                onChange={(event) =>
                                    create.setData('title', event.target.value)
                                }
                            />
                        </label>
                        <label>
                            Fecha objetivo
                            <input
                                required
                                type="date"
                                value={create.data.due_at}
                                onChange={(event) =>
                                    create.setData('due_at', event.target.value)
                                }
                            />
                        </label>
                        <label>
                            Descripción
                            <textarea
                                required
                                value={create.data.description}
                                onChange={(event) =>
                                    create.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Contención inmediata
                            <textarea
                                value={create.data.immediate_action}
                                onChange={(event) =>
                                    create.setData(
                                        'immediate_action',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Causa preliminar
                            <textarea
                                value={create.data.root_cause}
                                onChange={(event) =>
                                    create.setData(
                                        'root_cause',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Acción correctiva
                            <textarea
                                required
                                value={create.data.corrective_action}
                                onChange={(event) =>
                                    create.setData(
                                        'corrective_action',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Acción preventiva
                            <textarea
                                value={create.data.preventive_action}
                                onChange={(event) =>
                                    create.setData(
                                        'preventive_action',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={create.processing}
                        >
                            Abrir desviación y CAPA
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
            <MesRecordDialog
                open={closing !== null}
                onOpenChange={(open) => !open && setClosing(null)}
                title={`Cerrar ${value(closing?.number, 'desviación')}`}
                description="Registra causa raíz, disposición y evidencia de efectividad antes de liberar el objeto afectado."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        close.patch(
                            `/mes/quality/deviations/${value(closing?.id)}/close`,
                            {
                                preserveScroll: true,
                                onSuccess: () => {
                                    close.reset();
                                    setClosing(null);
                                },
                            },
                        );
                    }}
                >
                    <label>
                        Causa raíz
                        <textarea
                            required
                            value={close.data.root_cause}
                            onChange={(event) =>
                                close.setData('root_cause', event.target.value)
                            }
                        />
                    </label>
                    <label>
                        Disposición final
                        <textarea
                            required
                            value={close.data.disposition}
                            onChange={(event) =>
                                close.setData('disposition', event.target.value)
                            }
                        />
                    </label>
                    <label>
                        Verificación de efectividad
                        <textarea
                            required
                            value={close.data.effectiveness_result}
                            onChange={(event) =>
                                close.setData(
                                    'effectiveness_result',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={close.processing}
                        >
                            <BadgeCheck /> Cerrar y liberar
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}

export function MaintenanceSection({ data }: { data: Props }) {
    const [assetOpen, setAssetOpen] = useState(false);
    const [orderOpen, setOrderOpen] = useState(false);
    const [completing, setCompleting] = useState<Item | null>(null);
    const assets = (data.assets ?? []) as Item[];
    const orders = (data.workOrders ?? []) as Item[];
    const asset = useForm({
        code: '',
        name: '',
        type: 'EQUIPMENT',
        work_center_id: '',
        location_id: '',
        criticality: 'MEDIUM',
        manufacturer: '',
        serial_number: '',
        next_maintenance_at: '',
        calibration_due_at: '',
    });
    const order = useForm({
        asset_id: '',
        type: 'PREVENTIVE',
        priority: 'NORMAL',
        description: '',
        scheduled_at: '',
    });
    const complete = useForm({
        result: '',
        downtime_minutes: '0',
        next_due_at: '',
    });
    const openOrders = orders.filter((item) => item.status !== 'COMPLETED');

    return (
        <div className="stack-lg">
            <div className="phase-metrics">
                <Metric
                    icon={Wrench}
                    label="Activos"
                    metric={assets.length}
                    detail="Equipos e instrumentos"
                />
                <Metric
                    icon={ClipboardPlus}
                    label="OT abiertas"
                    metric={openOrders.length}
                    detail="Trabajo por ejecutar"
                />
                <Metric
                    icon={ShieldCheck}
                    label="Bloqueados"
                    metric={
                        assets.filter((item) => item.status === 'BLOCKED')
                            .length
                    }
                    detail="No disponibles para proceso"
                />
            </div>
            <Card
                title="Activos y calibración"
                action={
                    <button
                        className="secondary-button"
                        onClick={() => setAssetOpen(true)}
                    >
                        <Plus /> Nuevo activo
                    </button>
                }
            >
                <Table
                    headers={[
                        'Código',
                        'Activo',
                        'Tipo',
                        'Centro',
                        'Criticidad',
                        'Estado',
                        'Mantenimiento',
                        'Calibración',
                    ]}
                    rows={assets.map((item) => [
                        value(item.code),
                        value(item.name),
                        value(item.type),
                        value(item.work_center ?? item.location),
                        <Status value={item.criticality} />,
                        <Status value={item.status} />,
                        value(item.next_maintenance_at),
                        value(item.calibration_due_at),
                    ])}
                />
            </Card>
            <Card
                title="Órdenes de mantenimiento"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setOrderOpen(true)}
                    >
                        <Plus /> Nueva OT
                    </button>
                }
            >
                <Table
                    headers={[
                        'Orden',
                        'Activo',
                        'Tipo',
                        'Prioridad',
                        'Estado',
                        'Programada',
                        'Paro',
                        'Acción',
                    ]}
                    rows={orders.map((item) => [
                        value(item.number),
                        `${value(item.asset)} · ${value(item.asset_name)}`,
                        value(item.type),
                        <Status value={item.priority} />,
                        <Status value={item.status} />,
                        date(item.scheduled_at),
                        `${value(item.downtime_minutes, '0')} min`,
                        item.status !== 'COMPLETED' ? (
                            <button
                                className="small-button"
                                onClick={() => setCompleting(item)}
                            >
                                <BadgeCheck /> Completar
                            </button>
                        ) : (
                            value(item.result)
                        ),
                    ])}
                />
            </Card>
            <MesRecordDialog
                open={assetOpen}
                onOpenChange={setAssetOpen}
                title="Nuevo activo"
                description="Da de alta equipo o instrumento y define su criticidad y próximas intervenciones."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        asset.post('/mes/maintenance/assets', {
                            preserveScroll: true,
                            onSuccess: () => {
                                asset.reset();
                                setAssetOpen(false);
                            },
                        });
                    }}
                >
                    <div className="form-grid">
                        <label>
                            Código
                            <input
                                required
                                value={asset.data.code}
                                onChange={(event) =>
                                    asset.setData('code', event.target.value)
                                }
                            />
                        </label>
                        <label>
                            Nombre
                            <input
                                required
                                value={asset.data.name}
                                onChange={(event) =>
                                    asset.setData('name', event.target.value)
                                }
                            />
                        </label>
                        <label>
                            Tipo
                            <select
                                value={asset.data.type}
                                onChange={(event) =>
                                    asset.setData('type', event.target.value)
                                }
                            >
                                {[
                                    'EQUIPMENT',
                                    'INSTRUMENT',
                                    'UTILITY',
                                    'VEHICLE',
                                ].map((item) => (
                                    <option key={item}>{item}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Criticidad
                            <select
                                value={asset.data.criticality}
                                onChange={(event) =>
                                    asset.setData(
                                        'criticality',
                                        event.target.value,
                                    )
                                }
                            >
                                {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(
                                    (item) => (
                                        <option key={item}>{item}</option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label>
                            Centro de trabajo
                            <select
                                value={asset.data.work_center_id}
                                onChange={(event) =>
                                    asset.setData(
                                        'work_center_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Sin centro</option>
                                {((data.workCenters ?? []) as Item[]).map(
                                    (item) => (
                                        <option
                                            key={value(item.id)}
                                            value={value(item.id)}
                                        >
                                            {value(item.code)} ·{' '}
                                            {value(item.description)}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label>
                            Ubicación
                            <select
                                value={asset.data.location_id}
                                onChange={(event) =>
                                    asset.setData(
                                        'location_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Sin ubicación</option>
                                {((data.locations ?? []) as Item[]).map(
                                    (item) => (
                                        <option
                                            key={value(item.id)}
                                            value={value(item.id)}
                                        >
                                            {value(item.code)}
                                        </option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label>
                            Fabricante
                            <input
                                value={asset.data.manufacturer}
                                onChange={(event) =>
                                    asset.setData(
                                        'manufacturer',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Número de serie
                            <input
                                value={asset.data.serial_number}
                                onChange={(event) =>
                                    asset.setData(
                                        'serial_number',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Próximo mantenimiento
                            <input
                                type="date"
                                value={asset.data.next_maintenance_at}
                                onChange={(event) =>
                                    asset.setData(
                                        'next_maintenance_at',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Próxima calibración
                            <input
                                type="date"
                                value={asset.data.calibration_due_at}
                                onChange={(event) =>
                                    asset.setData(
                                        'calibration_due_at',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={asset.processing}
                        >
                            Guardar activo
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
            <MesRecordDialog
                open={orderOpen}
                onOpenChange={setOrderOpen}
                title="Nueva orden de mantenimiento"
                description="El activo quedará en mantenimiento o bloqueado hasta cerrar la orden."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        order.post('/mes/maintenance/work-orders', {
                            preserveScroll: true,
                            onSuccess: () => {
                                order.reset();
                                setOrderOpen(false);
                            },
                        });
                    }}
                >
                    <div className="form-grid">
                        <label>
                            Activo
                            <select
                                required
                                value={order.data.asset_id}
                                onChange={(event) =>
                                    order.setData(
                                        'asset_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccionar</option>
                                {assets.map((item) => (
                                    <option
                                        key={value(item.id)}
                                        value={value(item.id)}
                                    >
                                        {value(item.code)} · {value(item.name)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Tipo
                            <select
                                value={order.data.type}
                                onChange={(event) =>
                                    order.setData('type', event.target.value)
                                }
                            >
                                {[
                                    'PREVENTIVE',
                                    'CORRECTIVE',
                                    'CALIBRATION',
                                ].map((item) => (
                                    <option key={item}>{item}</option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Prioridad
                            <select
                                value={order.data.priority}
                                onChange={(event) =>
                                    order.setData(
                                        'priority',
                                        event.target.value,
                                    )
                                }
                            >
                                {['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].map(
                                    (item) => (
                                        <option key={item}>{item}</option>
                                    ),
                                )}
                            </select>
                        </label>
                        <label>
                            Programada
                            <input
                                type="datetime-local"
                                value={order.data.scheduled_at}
                                onChange={(event) =>
                                    order.setData(
                                        'scheduled_at',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Descripción
                            <textarea
                                required
                                value={order.data.description}
                                onChange={(event) =>
                                    order.setData(
                                        'description',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={order.processing}
                        >
                            Crear y controlar activo
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
            <MesRecordDialog
                open={completing !== null}
                onOpenChange={(open) => !open && setCompleting(null)}
                title={`Completar ${value(completing?.number, 'OT')}`}
                description="Documenta resultado, indisponibilidad y próxima fecha antes de liberar el activo."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        complete.patch(
                            `/mes/maintenance/work-orders/${value(completing?.id)}/complete`,
                            {
                                preserveScroll: true,
                                onSuccess: () => {
                                    complete.reset();
                                    setCompleting(null);
                                },
                            },
                        );
                    }}
                >
                    <label>
                        Resultado
                        <textarea
                            required
                            value={complete.data.result}
                            onChange={(event) =>
                                complete.setData('result', event.target.value)
                            }
                        />
                    </label>
                    <label>
                        Minutos de paro
                        <input
                            required
                            type="number"
                            min="0"
                            value={complete.data.downtime_minutes}
                            onChange={(event) =>
                                complete.setData(
                                    'downtime_minutes',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Próxima intervención
                        <input
                            type="date"
                            value={complete.data.next_due_at}
                            onChange={(event) =>
                                complete.setData(
                                    'next_due_at',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={complete.processing}
                        >
                            <BadgeCheck /> Completar y liberar
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}
