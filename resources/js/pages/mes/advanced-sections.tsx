import { type FormEvent, useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    Activity,
    Beaker,
    CircleGauge,
    FlaskConical,
    Plus,
    ShieldCheck,
    Wrench,
} from 'lucide-react';
import { MesRecordDialog } from '@/components/mes-record-dialog';

type Item = Record<string, unknown>;
type Props = Record<string, unknown>;

const text = (value: unknown, fallback = '—'): string => {
    if (value === null || value === undefined || value === '') return fallback;
    if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
    ) {
        return String(value);
    }
    return JSON.stringify(value);
};
const date = (value: unknown) =>
    value ? new Date(text(value)).toLocaleString('es-MX') : '—';
const nowLocal = () =>
    new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

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

export function LaboratorySection({ data }: { data: Props }) {
    const [methodOpen, setMethodOpen] = useState(false);
    const [sampleOpen, setSampleOpen] = useState(false);
    const [resultOpen, setResultOpen] = useState(false);
    const methods = (data.laboratoryMethods ?? []) as Item[];
    const samples = (data.laboratorySamples ?? []) as Item[];
    const results = (data.laboratoryResults ?? []) as Item[];
    const containers = (data.containers ?? []) as Item[];
    const orders = (data.orders ?? []) as Item[];
    const method = useForm({
        code: '',
        name: '',
        category: 'MICROBIOLOGY',
        result_type: 'NUMERIC',
        unit: '',
        min_value: '',
        max_value: '',
    });
    const sample = useForm({
        container_id: '',
        production_order_id: '',
        purpose: 'RELEASE',
        received_at: nowLocal(),
        due_at: '',
        notes: '',
    });
    const result = useForm({
        laboratory_sample_id: '',
        laboratory_method_id: '',
        result_value: '',
        result_text: '',
        tested_at: nowLocal(),
        notes: '',
    });
    const openSamples = samples.filter((item) =>
        ['RECEIVED', 'REVIEW_REQUIRED'].includes(text(item.status)),
    );

    const submitMethod = (event: FormEvent) => {
        event.preventDefault();
        method.post('/mes/quality/laboratory-methods', {
            preserveScroll: true,
            onSuccess: () => {
                method.reset();
                setMethodOpen(false);
            },
        });
    };
    const submitSample = (event: FormEvent) => {
        event.preventDefault();
        sample.post('/mes/quality/laboratory-samples', {
            preserveScroll: true,
            onSuccess: () => {
                sample.reset();
                setSampleOpen(false);
            },
        });
    };
    const submitResult = (event: FormEvent) => {
        event.preventDefault();
        result.post('/mes/quality/laboratory-results', {
            preserveScroll: true,
            onSuccess: () => {
                result.reset();
                setResultOpen(false);
            },
        });
    };

    return (
        <div className="stack-xl">
            <div className="phase-metrics">
                <Metric
                    icon={FlaskConical}
                    label="Métodos activos"
                    metric={methods.length}
                    detail="Microbiología, química y estabilidad"
                />
                <Metric
                    icon={Beaker}
                    label="Muestras abiertas"
                    metric={openSamples.length}
                    detail="Recibidas o pendientes de dictamen"
                />
                <Metric
                    icon={ShieldCheck}
                    label="Resultados no conformes"
                    metric={
                        results.filter((item) => item.status === 'FAIL').length
                    }
                    detail="Con cuarentena automática del lote"
                />
            </div>

            <div className="mes-callout">
                <FlaskConical />
                <div>
                    <strong>Laboratorio interno trazable</strong>
                    <p>
                        Los límites sin validar permanecen en revisión. La
                        conexión con un LIMS externo continúa como brecha y no
                        se simula.
                    </p>
                </div>
            </div>

            <Card
                title="Muestras de laboratorio"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setSampleOpen(true)}
                    >
                        <Plus /> Nueva muestra
                    </button>
                }
            >
                <Table
                    headers={[
                        'Muestra',
                        'Propósito',
                        'Lote / orden',
                        'Recepción',
                        'Resultados',
                        'Estado',
                    ]}
                    rows={samples.map((item) => [
                        text(item.number),
                        text(item.purpose),
                        text(item.container, text(item.production_order)),
                        date(item.received_at),
                        text(item.result_count, '0'),
                        <Status value={item.status} />,
                    ])}
                />
            </Card>

            <Card
                title="Resultados analíticos"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setResultOpen(true)}
                    >
                        <Plus /> Registrar resultado
                    </button>
                }
            >
                <Table
                    headers={[
                        'Muestra',
                        'Método',
                        'Resultado',
                        'Lote / orden',
                        'Analista',
                        'Fecha',
                        'Dictamen',
                    ]}
                    rows={results.map((item) => [
                        text(item.sample),
                        `${text(item.method)} · ${text(item.method_name)}`,
                        item.result_value !== null
                            ? `${text(item.result_value)} ${text(item.unit, '')}`
                            : text(item.result_text),
                        text(item.container, text(item.production_order)),
                        text(item.analyst),
                        date(item.tested_at),
                        <Status value={item.status} />,
                    ])}
                />
            </Card>

            <Card
                title="Catálogo de métodos"
                action={
                    <button
                        className="secondary-button"
                        onClick={() => setMethodOpen(true)}
                    >
                        <Plus /> Nuevo método
                    </button>
                }
            >
                <Table
                    headers={[
                        'Código',
                        'Método',
                        'Categoría',
                        'Tipo',
                        'Unidad',
                        'Especificación',
                    ]}
                    rows={methods.map((item) => [
                        text(item.code),
                        text(item.name),
                        text(item.category),
                        text(item.result_type),
                        text(item.unit),
                        item.min_value === null && item.max_value === null
                            ? 'Pendiente de validar'
                            : `${text(item.min_value, '—')} a ${text(item.max_value, '—')}`,
                    ])}
                />
            </Card>

            <MesRecordDialog
                open={sampleOpen}
                onOpenChange={setSampleOpen}
                title="Recibir muestra"
                description="Relaciona la muestra con un lote o una orden para conservar su trazabilidad."
            >
                <form className="mes-form" onSubmit={submitSample}>
                    <div className="form-grid">
                        <label>
                            Lote / contenedor
                            <select
                                value={sample.data.container_id}
                                onChange={(event) =>
                                    sample.setData(
                                        'container_id',
                                        event.target.value,
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
                        <label>
                            Orden de producción
                            <select
                                value={sample.data.production_order_id}
                                onChange={(event) =>
                                    sample.setData(
                                        'production_order_id',
                                        event.target.value,
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
                            Propósito
                            <select
                                value={sample.data.purpose}
                                onChange={(event) =>
                                    sample.setData(
                                        'purpose',
                                        event.target.value,
                                    )
                                }
                                required
                            >
                                <option value="RELEASE">Liberación</option>
                                <option value="STABILITY">Estabilidad</option>
                                <option value="INVESTIGATION">
                                    Investigación
                                </option>
                                <option value="PROCESS">
                                    Control de proceso
                                </option>
                            </select>
                        </label>
                        <label>
                            Recibida
                            <input
                                type="datetime-local"
                                value={sample.data.received_at}
                                onChange={(event) =>
                                    sample.setData(
                                        'received_at',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Fecha compromiso
                            <input
                                type="datetime-local"
                                value={sample.data.due_at}
                                onChange={(event) =>
                                    sample.setData('due_at', event.target.value)
                                }
                            />
                        </label>
                    </div>
                    <label>
                        Observaciones
                        <textarea
                            value={sample.data.notes}
                            onChange={(event) =>
                                sample.setData('notes', event.target.value)
                            }
                        />
                    </label>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={sample.processing}
                        >
                            Recibir muestra
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={resultOpen}
                onOpenChange={setResultOpen}
                title="Registrar resultado analítico"
                description="El dictamen se calcula con los límites configurados; sin límites pasa a revisión."
            >
                <form className="mes-form" onSubmit={submitResult}>
                    <div className="form-grid">
                        <label>
                            Muestra
                            <select
                                value={result.data.laboratory_sample_id}
                                onChange={(event) =>
                                    result.setData(
                                        'laboratory_sample_id',
                                        event.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {openSamples.map((item) => (
                                    <option
                                        key={text(item.id)}
                                        value={text(item.id)}
                                    >
                                        {text(item.number)} ·{' '}
                                        {text(
                                            item.container,
                                            text(item.production_order),
                                        )}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Método
                            <select
                                value={result.data.laboratory_method_id}
                                onChange={(event) =>
                                    result.setData(
                                        'laboratory_method_id',
                                        event.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {methods.map((item) => (
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
                            Resultado numérico
                            <input
                                type="number"
                                step="any"
                                value={result.data.result_value}
                                onChange={(event) =>
                                    result.setData(
                                        'result_value',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Resultado de texto
                            <input
                                value={result.data.result_text}
                                onChange={(event) =>
                                    result.setData(
                                        'result_text',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Fecha de análisis
                            <input
                                type="datetime-local"
                                value={result.data.tested_at}
                                onChange={(event) =>
                                    result.setData(
                                        'tested_at',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                    </div>
                    <label>
                        Observaciones
                        <textarea
                            value={result.data.notes}
                            onChange={(event) =>
                                result.setData('notes', event.target.value)
                            }
                        />
                    </label>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={result.processing}
                        >
                            Guardar resultado
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={methodOpen}
                onOpenChange={setMethodOpen}
                title="Agregar método analítico"
                description="Los límites deben provenir de un método validado; pueden quedar vacíos para revisión manual."
            >
                <form className="mes-form" onSubmit={submitMethod}>
                    <div className="form-grid">
                        <label>
                            Código
                            <input
                                value={method.data.code}
                                onChange={(event) =>
                                    method.setData(
                                        'code',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Nombre
                            <input
                                value={method.data.name}
                                onChange={(event) =>
                                    method.setData('name', event.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Categoría
                            <select
                                value={method.data.category}
                                onChange={(event) =>
                                    method.setData(
                                        'category',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="MICROBIOLOGY">
                                    Microbiología
                                </option>
                                <option value="CHEMISTRY">Química</option>
                                <option value="STABILITY">Estabilidad</option>
                            </select>
                        </label>
                        <label>
                            Tipo de resultado
                            <select
                                value={method.data.result_type}
                                onChange={(event) =>
                                    method.setData(
                                        'result_type',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="NUMERIC">Numérico</option>
                                <option value="TEXT">Texto</option>
                            </select>
                        </label>
                        <label>
                            Unidad
                            <input
                                value={method.data.unit}
                                onChange={(event) =>
                                    method.setData('unit', event.target.value)
                                }
                            />
                        </label>
                        <label>
                            Límite mínimo
                            <input
                                type="number"
                                step="any"
                                value={method.data.min_value}
                                onChange={(event) =>
                                    method.setData(
                                        'min_value',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Límite máximo
                            <input
                                type="number"
                                step="any"
                                value={method.data.max_value}
                                onChange={(event) =>
                                    method.setData(
                                        'max_value',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={method.processing}
                        >
                            Guardar método
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}

export function MaintenanceConditionSection({ data }: { data: Props }) {
    const [open, setOpen] = useState(false);
    const assets = (data.assets ?? []) as Item[];
    const readings = (data.conditionReadings ?? []) as Item[];
    const kpis = (data.maintenanceKpis ?? {}) as Item;
    const summary = (kpis.summary ?? {}) as Item;
    const assetKpis = (kpis.assets ?? []) as Item[];
    const reading = useForm({
        asset_id: '',
        metric: 'OPERATING_HOURS',
        value: '',
        unit: 'h',
        warning_limit: '',
        critical_limit: '',
        measured_at: nowLocal(),
        notes: '',
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        reading.post('/mes/maintenance/condition-readings', {
            preserveScroll: true,
            onSuccess: () => {
                reading.reset();
                setOpen(false);
            },
        });
    };

    return (
        <div className="stack-xl">
            <div className="phase-metrics">
                <Metric
                    icon={Wrench}
                    label="MTTR observado"
                    metric={
                        summary.mttr_minutes === null ||
                        summary.mttr_minutes === undefined
                            ? 'Sin historial'
                            : `${text(summary.mttr_minutes)} min`
                    }
                    detail="Promedio de reparación correctiva"
                />
                <Metric
                    icon={CircleGauge}
                    label="MTBF observado"
                    metric={
                        summary.mtbf_minutes === null ||
                        summary.mtbf_minutes === undefined
                            ? 'Sin serie'
                            : `${text(summary.mtbf_minutes)} min`
                    }
                    detail="Intervalo medio entre fallas registradas"
                />
                <Metric
                    icon={Activity}
                    label="Condiciones críticas"
                    metric={text(summary.critical_readings, '0')}
                    detail="Bloquean el activo y generan una OT"
                />
            </div>

            <Card
                title="Monitoreo por condición"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setOpen(true)}
                    >
                        <Plus /> Registrar condición
                    </button>
                }
            >
                <Table
                    headers={[
                        'Activo',
                        'Métrica',
                        'Lectura',
                        'Advertencia',
                        'Crítico',
                        'Fecha',
                        'Estado',
                    ]}
                    rows={readings.map((item) => [
                        `${text(item.asset)} · ${text(item.asset_name)}`,
                        text(item.metric),
                        `${text(item.value)} ${text(item.unit)}`,
                        text(item.warning_limit),
                        text(item.critical_limit),
                        date(item.measured_at),
                        <Status value={item.status} />,
                    ])}
                />
            </Card>

            <Card title="Confiabilidad por activo">
                <Table
                    headers={['Activo', 'Fallas cerradas', 'MTTR', 'MTBF']}
                    rows={assetKpis.map((item) => [
                        `${text(item.asset)} · ${text(item.asset_name)}`,
                        text(item.failures),
                        `${text(item.mttr_minutes)} min`,
                        item.mtbf_minutes === null
                            ? 'Requiere ≥ 2 fallas'
                            : `${text(item.mtbf_minutes)} min`,
                    ])}
                />
            </Card>

            <MesRecordDialog
                open={open}
                onOpenChange={setOpen}
                title="Registrar condición del activo"
                description="Una lectura crítica bloquea el activo y abre automáticamente una orden correctiva."
            >
                <form className="mes-form" onSubmit={submit}>
                    <div className="form-grid">
                        <label>
                            Activo
                            <select
                                value={reading.data.asset_id}
                                onChange={(event) =>
                                    reading.setData(
                                        'asset_id',
                                        event.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {assets.map((item) => (
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
                            Métrica
                            <select
                                value={reading.data.metric}
                                onChange={(event) =>
                                    reading.setData(
                                        'metric',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="OPERATING_HOURS">
                                    Horas de operación
                                </option>
                                <option value="CYCLES">Ciclos</option>
                                <option value="TEMPERATURE">Temperatura</option>
                                <option value="VIBRATION">Vibración</option>
                                <option value="CURRENT">Corriente</option>
                                <option value="PRESSURE">Presión</option>
                            </select>
                        </label>
                        <label>
                            Valor
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={reading.data.value}
                                onChange={(event) =>
                                    reading.setData('value', event.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Unidad
                            <input
                                value={reading.data.unit}
                                onChange={(event) =>
                                    reading.setData('unit', event.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Límite de advertencia
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={reading.data.warning_limit}
                                onChange={(event) =>
                                    reading.setData(
                                        'warning_limit',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Límite crítico
                            <input
                                type="number"
                                min="0"
                                step="any"
                                value={reading.data.critical_limit}
                                onChange={(event) =>
                                    reading.setData(
                                        'critical_limit',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Fecha de medición
                            <input
                                type="datetime-local"
                                value={reading.data.measured_at}
                                onChange={(event) =>
                                    reading.setData(
                                        'measured_at',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                    </div>
                    <label>
                        Observaciones
                        <textarea
                            value={reading.data.notes}
                            onChange={(event) =>
                                reading.setData('notes', event.target.value)
                            }
                        />
                    </label>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={reading.processing}
                        >
                            Guardar lectura
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}
