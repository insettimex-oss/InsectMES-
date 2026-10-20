import { type FormEvent, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    AlarmClockOff,
    BadgeCheck,
    Boxes,
    CircleGauge,
    PackageCheck,
    Plus,
    TestTubeDiagonal,
} from 'lucide-react';
import { MesRecordDialog } from '@/components/mes-record-dialog';

type Item = Record<string, unknown>;
type Props = Record<string, unknown>;

const text = (input: unknown, fallback = '—'): string => {
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
    input ? new Date(text(input)).toLocaleString('es-MX') : '—';
const today = () => new Date().toISOString().slice(0, 10);
const nowLocal = () => {
    const value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
    return value.toISOString().slice(0, 16);
};

function Status({ value }: { value: unknown }) {
    const label = text(value);
    return (
        <span
            className={`status-pill status-${label.toLowerCase().replaceAll('_', '-')}`}
        >
            {label}
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

function Metric({
    icon: Icon,
    label,
    metric,
    detail,
}: {
    icon: typeof CircleGauge;
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

export function PerformanceSection({ data }: { data: Props }) {
    const [downtimeOpen, setDowntimeOpen] = useState(false);
    const [oeeOpen, setOeeOpen] = useState(false);
    const [closing, setClosing] = useState<Item | null>(null);
    const shifts = (data.shifts ?? []) as Item[];
    const centers = (data.workCenters ?? []) as Item[];
    const reasons = (data.downtimeReasons ?? []) as Item[];
    const orders = (data.orders ?? []) as Item[];
    const downtimes = (data.downtimeEvents ?? []) as Item[];
    const snapshots = (data.oeeSnapshots ?? []) as Item[];
    const summary = (data.oeeSummary ?? {}) as Item;
    const downtime = useForm({
        work_center_id: '',
        production_order_id: '',
        downtime_reason_id: '',
        started_at: nowLocal(),
        notes: '',
    });
    const close = useForm({ ended_at: nowLocal(), notes: '' });
    const oee = useForm({
        production_date: today(),
        shift_id: '',
        work_center_id: '',
        planned_minutes: '480',
        downtime_minutes: '0',
        ideal_cycle_minutes: '1',
        total_count: '',
        good_count: '',
        notes: '',
    });

    const submitDowntime = (event: FormEvent) => {
        event.preventDefault();
        downtime.post('/mes/performance/downtimes', {
            preserveScroll: true,
            onSuccess: () => {
                downtime.reset();
                downtime.setData('started_at', nowLocal());
                setDowntimeOpen(false);
            },
        });
    };
    const submitOee = (event: FormEvent) => {
        event.preventDefault();
        oee.post('/mes/performance/oee', {
            preserveScroll: true,
            onSuccess: () => {
                oee.reset();
                setOeeOpen(false);
            },
        });
    };

    return (
        <div className="stack-xl">
            <div className="phase-metrics">
                <Metric
                    icon={CircleGauge}
                    label="OEE promedio"
                    metric={`${text(summary.oee, '0')}%`}
                    detail="Disponibilidad × rendimiento × calidad"
                />
                <Metric
                    icon={AlarmClockOff}
                    label="Paros abiertos"
                    metric={text(summary.openDowntimes, '0')}
                    detail="Centros que requieren atención"
                />
                <Metric
                    icon={CircleGauge}
                    label="Minutos de paro"
                    metric={text(summary.downtimeMinutes, '0')}
                    detail="Acumulado cerrado de hoy"
                />
            </div>
            <Card
                title="Paros de operación"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setDowntimeOpen(true)}
                    >
                        <Plus /> Registrar paro
                    </button>
                }
            >
                <Table
                    headers={[
                        'Evento',
                        'Centro',
                        'Motivo',
                        'Orden',
                        'Inicio',
                        'Duración',
                        'Estado',
                        'Acción',
                    ]}
                    rows={downtimes.map((item) => [
                        text(item.number),
                        text(item.work_center),
                        text(item.reason),
                        text(item.production_order),
                        date(item.started_at),
                        `${text(item.duration_minutes, '0')} min`,
                        <Status value={item.status} />,
                        item.status === 'OPEN' ? (
                            <button
                                className="small-button"
                                onClick={() => {
                                    close.setData('ended_at', nowLocal());
                                    setClosing(item);
                                }}
                            >
                                Cerrar paro
                            </button>
                        ) : (
                            '—'
                        ),
                    ])}
                />
            </Card>
            <Card
                title="OEE por turno"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setOeeOpen(true)}
                    >
                        <Plus /> Cerrar turno
                    </button>
                }
            >
                <Table
                    headers={[
                        'Fecha',
                        'Turno',
                        'Centro',
                        'Disponibilidad',
                        'Rendimiento',
                        'Calidad',
                        'OEE',
                    ]}
                    rows={snapshots.map((item) => [
                        text(item.production_date),
                        text(item.shift),
                        text(item.work_center),
                        `${text(item.availability)}%`,
                        `${text(item.performance)}%`,
                        `${text(item.quality)}%`,
                        <strong>{text(item.oee)}%</strong>,
                    ])}
                />
            </Card>

            <MesRecordDialog
                open={downtimeOpen}
                onOpenChange={setDowntimeOpen}
                title="Registrar paro"
                description="Detiene el centro y abre la medición de tiempo real."
            >
                <form className="mes-form" onSubmit={submitDowntime}>
                    <div className="form-grid">
                        <label>
                            Centro de trabajo
                            <select
                                value={downtime.data.work_center_id}
                                onChange={(e) =>
                                    downtime.setData(
                                        'work_center_id',
                                        e.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {centers.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.code)} ·{' '}
                                        {text(item.description)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Motivo
                            <select
                                value={downtime.data.downtime_reason_id}
                                onChange={(e) =>
                                    downtime.setData(
                                        'downtime_reason_id',
                                        e.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {reasons.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.name)} ·{' '}
                                        {text(item.category)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Orden (opcional)
                            <select
                                value={downtime.data.production_order_id}
                                onChange={(e) =>
                                    downtime.setData(
                                        'production_order_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Sin orden</option>
                                {orders.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.number)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Inicio
                            <input
                                type="datetime-local"
                                value={downtime.data.started_at}
                                onChange={(e) =>
                                    downtime.setData(
                                        'started_at',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                    </div>
                    <label>
                        Observación
                        <textarea
                            value={downtime.data.notes}
                            onChange={(e) =>
                                downtime.setData('notes', e.target.value)
                            }
                        />
                    </label>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={downtime.processing}
                        >
                            Abrir paro
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={closing !== null}
                onOpenChange={(open) => !open && setClosing(null)}
                title={`Cerrar ${text(closing?.number, 'paro')}`}
                description="El sistema calcula la duración y libera el centro."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        close.patch(
                            `/mes/performance/downtimes/${text(closing?.id)}/close`,
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
                        Hora de cierre
                        <input
                            type="datetime-local"
                            value={close.data.ended_at}
                            onChange={(e) =>
                                close.setData('ended_at', e.target.value)
                            }
                            required
                        />
                    </label>
                    <label>
                        Causa/solución confirmada
                        <textarea
                            value={close.data.notes}
                            onChange={(e) =>
                                close.setData('notes', e.target.value)
                            }
                        />
                    </label>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={close.processing}
                        >
                            Confirmar cierre
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={oeeOpen}
                onOpenChange={setOeeOpen}
                title="Cierre OEE de turno"
                description="Captura el tiempo y la salida; el cálculo se realiza automáticamente."
            >
                <form className="mes-form" onSubmit={submitOee}>
                    <div className="form-grid">
                        <label>
                            Fecha
                            <input
                                type="date"
                                value={oee.data.production_date}
                                onChange={(e) =>
                                    oee.setData(
                                        'production_date',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Turno
                            <select
                                value={oee.data.shift_id}
                                onChange={(e) =>
                                    oee.setData('shift_id', e.target.value)
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {shifts.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.code)} · {text(item.name)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Centro
                            <select
                                value={oee.data.work_center_id}
                                onChange={(e) =>
                                    oee.setData(
                                        'work_center_id',
                                        e.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {centers.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.code)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Minutos planeados
                            <input
                                type="number"
                                min="1"
                                value={oee.data.planned_minutes}
                                onChange={(e) =>
                                    oee.setData(
                                        'planned_minutes',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Minutos de paro
                            <input
                                type="number"
                                min="0"
                                value={oee.data.downtime_minutes}
                                onChange={(e) =>
                                    oee.setData(
                                        'downtime_minutes',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Ciclo ideal (min/pieza)
                            <input
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                value={oee.data.ideal_cycle_minutes}
                                onChange={(e) =>
                                    oee.setData(
                                        'ideal_cycle_minutes',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Producción total
                            <input
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                value={oee.data.total_count}
                                onChange={(e) =>
                                    oee.setData('total_count', e.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Producción buena
                            <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={oee.data.good_count}
                                onChange={(e) =>
                                    oee.setData('good_count', e.target.value)
                                }
                                required
                            />
                        </label>
                    </div>
                    <label>
                        Notas
                        <textarea
                            value={oee.data.notes}
                            onChange={(e) =>
                                oee.setData('notes', e.target.value)
                            }
                        />
                    </label>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={oee.processing}
                        >
                            Calcular y guardar
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}

export function QualityReleaseSection({ data }: { data: Props }) {
    const [certificateOpen, setCertificateOpen] = useState(false);
    const [sampleOpen, setSampleOpen] = useState(false);
    const certificates = (data.certificates ?? []) as Item[];
    const samples = (data.retentionSamples ?? []) as Item[];
    const containers = (data.containers ?? []) as Item[];
    const orders = (data.orders ?? []) as Item[];
    const certificate = useForm({
        production_order_id: '',
        container_id: '',
        notes: '',
    });
    const sample = useForm({
        container_id: '',
        production_order_id: '',
        quantity: '',
        unit: 'g',
        storage_location: '',
        retained_at: today(),
        expires_at: '',
    });
    return (
        <div className="stack-xl">
            <Card
                title="Certificados de análisis (COA)"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setCertificateOpen(true)}
                    >
                        <Plus /> Preparar COA
                    </button>
                }
            >
                <Table
                    headers={[
                        'Certificado',
                        'Orden',
                        'Contenedor',
                        'Resultados',
                        'Estado',
                        'Aprobación',
                        'Acción',
                    ]}
                    rows={certificates.map((item) => [
                        text(item.number),
                        text(item.production_order),
                        text(item.container),
                        text(item.result_count, '0'),
                        <Status value={item.status} />,
                        date(item.approved_at),
                        item.status === 'DRAFT' ? (
                            <button
                                className="small-button"
                                onClick={() =>
                                    router.patch(
                                        `/mes/quality/certificates/${text(item.id)}/approve`,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                Aprobar COA
                            </button>
                        ) : (
                            '—'
                        ),
                    ])}
                />
            </Card>
            <Card
                title="Muestras de retención"
                action={
                    <button
                        className="secondary-button"
                        onClick={() => setSampleOpen(true)}
                    >
                        <TestTubeDiagonal /> Registrar muestra
                    </button>
                }
            >
                <Table
                    headers={[
                        'Muestra',
                        'Contenedor',
                        'Orden',
                        'Cantidad',
                        'Ubicación',
                        'Retención',
                        'Caducidad',
                        'Estado',
                    ]}
                    rows={samples.map((item) => [
                        text(item.code),
                        text(item.container),
                        text(item.production_order),
                        `${text(item.quantity)} ${text(item.unit)}`,
                        text(item.storage_location),
                        text(item.retained_at),
                        text(item.expires_at),
                        <Status value={item.status} />,
                    ])}
                />
            </Card>
            <MesRecordDialog
                open={certificateOpen}
                onOpenChange={setCertificateOpen}
                title="Preparar certificado de análisis"
                description="Agrupa las inspecciones aprobadas y liberadas del lote."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        certificate.post('/mes/quality/certificates', {
                            preserveScroll: true,
                            onSuccess: () => {
                                certificate.reset();
                                setCertificateOpen(false);
                            },
                        });
                    }}
                >
                    <div className="form-grid">
                        <label>
                            Orden
                            <select
                                value={certificate.data.production_order_id}
                                onChange={(e) =>
                                    certificate.setData(
                                        'production_order_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Sin orden</option>
                                {orders.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.number)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Contenedor
                            <select
                                value={certificate.data.container_id}
                                onChange={(e) =>
                                    certificate.setData(
                                        'container_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Sin contenedor</option>
                                {containers.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.serial)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label>
                        Notas
                        <textarea
                            value={certificate.data.notes}
                            onChange={(e) =>
                                certificate.setData('notes', e.target.value)
                            }
                        />
                    </label>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={certificate.processing}
                        >
                            Crear borrador
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
            <MesRecordDialog
                open={sampleOpen}
                onOpenChange={setSampleOpen}
                title="Registrar muestra de retención"
                description="Conserva una muestra trazable para investigación o verificación posterior."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        sample.post('/mes/quality/retention-samples', {
                            preserveScroll: true,
                            onSuccess: () => {
                                sample.reset();
                                setSampleOpen(false);
                            },
                        });
                    }}
                >
                    <div className="form-grid">
                        <label>
                            Contenedor
                            <select
                                value={sample.data.container_id}
                                onChange={(e) =>
                                    sample.setData(
                                        'container_id',
                                        e.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {containers.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.serial)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Orden
                            <select
                                value={sample.data.production_order_id}
                                onChange={(e) =>
                                    sample.setData(
                                        'production_order_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Sin orden</option>
                                {orders.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.number)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Cantidad
                            <input
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                value={sample.data.quantity}
                                onChange={(e) =>
                                    sample.setData('quantity', e.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Unidad
                            <input
                                value={sample.data.unit}
                                onChange={(e) =>
                                    sample.setData('unit', e.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Ubicación de resguardo
                            <input
                                value={sample.data.storage_location}
                                onChange={(e) =>
                                    sample.setData(
                                        'storage_location',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Fecha de retención
                            <input
                                type="date"
                                value={sample.data.retained_at}
                                onChange={(e) =>
                                    sample.setData(
                                        'retained_at',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Caducidad
                            <input
                                type="date"
                                value={sample.data.expires_at}
                                onChange={(e) =>
                                    sample.setData('expires_at', e.target.value)
                                }
                                required
                            />
                        </label>
                    </div>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={sample.processing}
                        >
                            Guardar muestra
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}

export function MaintenanceSparesSection({ data }: { data: Props }) {
    const [partOpen, setPartOpen] = useState(false);
    const [usageOpen, setUsageOpen] = useState(false);
    const parts = (data.spareParts ?? []) as Item[];
    const usages = (data.spareUsages ?? []) as Item[];
    const workOrders = ((data.workOrders ?? []) as Item[]).filter(
        (item) => item.status !== 'COMPLETED',
    );
    const part = useForm({
        code: '',
        name: '',
        quantity_on_hand: '',
        reorder_point: '',
        unit: 'pc',
        storage_location: '',
    });
    const usage = useForm({
        maintenance_work_order_id: '',
        spare_part_id: '',
        quantity: '',
    });
    return (
        <div className="stack-xl">
            <Card
                title="Almacén de repuestos"
                action={
                    <div className="inline-actions">
                        <button
                            className="secondary-button"
                            onClick={() => setUsageOpen(true)}
                        >
                            <PackageCheck /> Consumir
                        </button>
                        <button
                            className="primary-button"
                            onClick={() => setPartOpen(true)}
                        >
                            <Plus /> Nuevo repuesto
                        </button>
                    </div>
                }
            >
                <Table
                    headers={[
                        'Código',
                        'Repuesto',
                        'Existencia',
                        'Reorden',
                        'Ubicación',
                        'Nivel',
                    ]}
                    rows={parts.map((item) => [
                        text(item.code),
                        text(item.name),
                        `${text(item.quantity_on_hand)} ${text(item.unit)}`,
                        `${text(item.reorder_point)} ${text(item.unit)}`,
                        text(item.storage_location),
                        Number(item.quantity_on_hand) <=
                        Number(item.reorder_point) ? (
                            <Status value="LOW" />
                        ) : (
                            <Status value="NORMAL" />
                        ),
                    ])}
                />
            </Card>
            <Card title="Consumo de repuestos">
                <Table
                    headers={[
                        'Orden',
                        'Repuesto',
                        'Descripción',
                        'Cantidad',
                        'Fecha',
                    ]}
                    rows={usages.map((item) => [
                        text(item.work_order),
                        text(item.spare_part),
                        text(item.name),
                        `${text(item.quantity)} ${text(item.unit)}`,
                        date(item.created_at),
                    ])}
                />
            </Card>
            <MesRecordDialog
                open={partOpen}
                onOpenChange={setPartOpen}
                title="Alta de repuesto"
                description="Crea una existencia controlada con punto de reorden."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        part.post('/mes/maintenance/spare-parts', {
                            preserveScroll: true,
                            onSuccess: () => {
                                part.reset();
                                setPartOpen(false);
                            },
                        });
                    }}
                >
                    <div className="form-grid">
                        <label>
                            Código
                            <input
                                value={part.data.code}
                                onChange={(e) =>
                                    part.setData('code', e.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Descripción
                            <input
                                value={part.data.name}
                                onChange={(e) =>
                                    part.setData('name', e.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Existencia inicial
                            <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={part.data.quantity_on_hand}
                                onChange={(e) =>
                                    part.setData(
                                        'quantity_on_hand',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Punto de reorden
                            <input
                                type="number"
                                min="0"
                                step="0.0001"
                                value={part.data.reorder_point}
                                onChange={(e) =>
                                    part.setData(
                                        'reorder_point',
                                        e.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Unidad
                            <input
                                value={part.data.unit}
                                onChange={(e) =>
                                    part.setData('unit', e.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Ubicación
                            <input
                                value={part.data.storage_location}
                                onChange={(e) =>
                                    part.setData(
                                        'storage_location',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={part.processing}
                        >
                            <Boxes /> Guardar repuesto
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
            <MesRecordDialog
                open={usageOpen}
                onOpenChange={setUsageOpen}
                title="Consumir repuesto"
                description="Descuenta existencia y la vincula a una orden de mantenimiento abierta."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        usage.post('/mes/maintenance/spare-parts/consume', {
                            preserveScroll: true,
                            onSuccess: () => {
                                usage.reset();
                                setUsageOpen(false);
                            },
                        });
                    }}
                >
                    <div className="form-grid">
                        <label>
                            Orden de mantenimiento
                            <select
                                value={usage.data.maintenance_work_order_id}
                                onChange={(e) =>
                                    usage.setData(
                                        'maintenance_work_order_id',
                                        e.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {workOrders.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.number)} · {text(item.asset)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Repuesto
                            <select
                                value={usage.data.spare_part_id}
                                onChange={(e) =>
                                    usage.setData(
                                        'spare_part_id',
                                        e.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {parts.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.code)} ·{' '}
                                        {text(item.quantity_on_hand)}{' '}
                                        {text(item.unit)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Cantidad
                            <input
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                value={usage.data.quantity}
                                onChange={(e) =>
                                    usage.setData('quantity', e.target.value)
                                }
                                required
                            />
                        </label>
                    </div>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={usage.processing}
                        >
                            <BadgeCheck /> Confirmar consumo
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}
