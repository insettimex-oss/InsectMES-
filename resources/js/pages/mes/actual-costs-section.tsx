import { type FormEvent, type ReactNode, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    BadgeDollarSign,
    Calculator,
    CircleDollarSign,
    LockKeyhole,
    Plus,
    ReceiptText,
    Scale,
} from 'lucide-react';
import { MesRecordDialog } from '@/components/mes-record-dialog';

type Item = Record<string, unknown>;
type StandardCost = {
    operation: string;
    material: number;
    labor: number;
    overhead: number;
    total: number;
    accumulated: number;
};

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
const money = (input: unknown) =>
    Number(input ?? 0).toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN',
    });
const date = (input: unknown) =>
    input ? new Date(value(input)).toLocaleString('es-MX') : '—';

function Status({ children }: { children: unknown }) {
    const text = value(children);
    return (
        <span
            className={`status-pill status-${text.toLowerCase().replaceAll('_', '-')}`}
        >
            {text}
        </span>
    );
}

function Metric({
    icon: Icon,
    label,
    metric,
    detail,
}: {
    icon: typeof Calculator;
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

export function ActualCostsSection({
    data,
}: {
    data: {
        costs?: StandardCost[];
        summary?: Record<string, number>;
        costOrders?: Item[];
        costEntries?: Item[];
        costRates?: Item[];
        costParts?: Item[];
        costWorkCenters?: Item[];
        actualCostSummary?: Item;
    };
}) {
    const permissions = usePage().props.auth.user?.permissions ?? [];
    const canWrite = permissions.includes('costs.write');
    const canApprove = permissions.includes('costs.approve');
    const orders = data.costOrders ?? [];
    const entries = data.costEntries ?? [];
    const rates = data.costRates ?? [];
    const parts = data.costParts ?? [];
    const workCenters = data.costWorkCenters ?? [];
    const actual = data.actualCostSummary ?? {};
    const standard = data.costs ?? [];
    const standardSummary = data.summary ?? {};
    const [dialog, setDialog] = useState<'rate' | 'entry' | 'close' | null>(
        null,
    );
    const [selectedOrder, setSelectedOrder] = useState<number | null>(null);

    const rateForm = useForm({
        code: '',
        name: '',
        category: 'MATERIAL',
        part_id: '',
        work_center_id: '',
        unit_cost: '',
        unit: 'kg',
        effective_from: new Date().toISOString().slice(0, 10),
        effective_to: '',
    });
    const entryForm = useForm({
        production_order_id: '',
        cost_rate_id: '',
        quantity: '',
        description: '',
        occurred_at: new Date().toISOString().slice(0, 16),
    });
    const closeForm = useForm({ closure_notes: '' });

    const finish = (reset: () => void) => {
        reset();
        setDialog(null);
        setSelectedOrder(null);
    };
    const submitRate = (event: FormEvent) => {
        event.preventDefault();
        rateForm.post('/mes/costs/rates', {
            preserveScroll: true,
            onSuccess: () => finish(() => rateForm.reset()),
        });
    };
    const submitEntry = (event: FormEvent) => {
        event.preventDefault();
        entryForm.post('/mes/costs/entries', {
            preserveScroll: true,
            onSuccess: () => finish(() => entryForm.reset()),
        });
    };
    const submitClose = (event: FormEvent) => {
        event.preventDefault();
        if (!selectedOrder) return;
        closeForm.patch(`/mes/costs/orders/${selectedOrder}/close`, {
            preserveScroll: true,
            onSuccess: () => finish(() => closeForm.reset()),
        });
    };

    return (
        <div className="stack-xl">
            <div className="phase-metrics">
                <Metric
                    icon={Calculator}
                    label="Lotes por revisar"
                    metric={value(actual.openLots, '0')}
                    detail="Costo calculado, aún abierto"
                />
                <Metric
                    icon={LockKeyhole}
                    label="Lotes cerrados"
                    metric={value(actual.closedLots, '0')}
                    detail="Protegidos contra cambios"
                />
                <Metric
                    icon={CircleDollarSign}
                    label="Costo real acumulado"
                    metric={money(actual.netCost)}
                    detail="Órdenes con cálculo"
                />
                <Metric
                    icon={Scale}
                    label="Costo unitario promedio"
                    metric={money(actual.averageUnitCost)}
                    detail="Promedio de lotes costeados"
                />
            </div>

            {canWrite && (
                <div className="record-actions">
                    <button
                        className="secondary-button"
                        onClick={() => setDialog('rate')}
                        type="button"
                    >
                        <BadgeDollarSign /> Nueva tarifa
                    </button>
                    <button
                        className="primary-button"
                        onClick={() => setDialog('entry')}
                        type="button"
                    >
                        <Plus /> Registrar costo real
                    </button>
                </div>
            )}

            <Card title="Costo real por orden y lote">
                <Table
                    headers={[
                        'Orden',
                        'Producto',
                        'Salida real',
                        'Neto',
                        'Unitario',
                        'Estado',
                        'Acción',
                    ]}
                    rows={orders.map((order) => [
                        value(order.number),
                        <span key="part">
                            <b>{value(order.part_code)}</b>
                            <br />
                            <small>{value(order.part_name)}</small>
                        </span>,
                        `${value(order.output_quantity ?? order.completed_quantity, '0')} ${value(order.unit)}`,
                        <span key="net">
                            <b>{money(order.net_cost)}</b>
                            <br />
                            <small>
                                MP {money(order.material_cost)} · MO{' '}
                                {money(order.labor_cost)} · Crédito{' '}
                                {money(order.coproduct_credit)}
                            </small>
                        </span>,
                        money(order.unit_cost),
                        <Status key="status">
                            {order.cost_status ?? 'SIN CALCULAR'}
                        </Status>,
                        <div className="inline-actions" key="actions">
                            {canWrite && order.cost_status !== 'CLOSED' && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.post(
                                            `/mes/costs/orders/${value(order.id)}/calculate`,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    Recalcular
                                </button>
                            )}
                            {canApprove &&
                                order.order_status === 'COMPLETED' &&
                                order.cost_status === 'DRAFT' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedOrder(Number(order.id));
                                            setDialog('close');
                                        }}
                                    >
                                        Cerrar
                                    </button>
                                )}
                        </div>,
                    ])}
                />
            </Card>

            <div className="mes-two-column">
                <Card title="Movimientos reales del lote">
                    <Table
                        headers={[
                            'Orden',
                            'Categoría',
                            'Origen',
                            'Cantidad',
                            'Importe',
                            'Fecha',
                        ]}
                        rows={entries.map((entry) => [
                            value(entry.order_number),
                            value(entry.category),
                            <span key="source">
                                {value(entry.description)}
                                <br />
                                <small>{value(entry.source_type)}</small>
                            </span>,
                            `${value(entry.quantity)} ${value(entry.unit)}`,
                            money(entry.amount),
                            date(entry.occurred_at),
                        ])}
                    />
                </Card>
                <Card title="Tarifas efectivas">
                    <Table
                        headers={[
                            'Código',
                            'Categoría',
                            'Aplicación',
                            'Tarifa',
                            'Vigencia',
                        ]}
                        rows={rates.map((rate) => [
                            value(rate.code),
                            value(rate.category),
                            value(
                                rate.part_code ?? rate.work_center ?? 'General',
                            ),
                            `${money(rate.unit_cost)} / ${value(rate.unit)}`,
                            value(rate.effective_from),
                        ])}
                    />
                </Card>
            </div>

            <Card title="Referencia de costo estándar">
                <div className="cost-summary">
                    {[
                        ['Costo estándar / kg', standardSummary.total ?? 0],
                        ['Materia prima', standardSummary.material ?? 0],
                        ['Mano de obra', standardSummary.labor ?? 0],
                        ['Indirectos', standardSummary.overhead ?? 0],
                    ].map(([label, amount]) => (
                        <article key={String(label)}>
                            <span>{label}</span>
                            <strong>{money(amount)}</strong>
                        </article>
                    ))}
                </div>
                <Table
                    headers={[
                        'Proceso',
                        'MP / kg',
                        'MO / kg',
                        'GIF / kg',
                        'Proceso / kg',
                        'Acumulado / kg',
                    ]}
                    rows={standard.map((row) => [
                        row.operation,
                        money(row.material),
                        money(row.labor),
                        money(row.overhead),
                        money(row.total),
                        money(row.accumulated),
                    ])}
                />
            </Card>

            <MesRecordDialog
                open={dialog === 'rate'}
                onOpenChange={(open) => !open && setDialog(null)}
                title="Nueva tarifa efectiva"
                description="Versiona el valor usado para materiales, mano de obra, energía, indirectos o créditos por coproducto."
            >
                <form className="mes-form" onSubmit={submitRate}>
                    <div className="form-grid">
                        <label>
                            Código
                            <input
                                required
                                value={rateForm.data.code}
                                onChange={(e) =>
                                    rateForm.setData('code', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Nombre
                            <input
                                required
                                value={rateForm.data.name}
                                onChange={(e) =>
                                    rateForm.setData('name', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Categoría
                            <select
                                value={rateForm.data.category}
                                onChange={(e) =>
                                    rateForm.setData('category', e.target.value)
                                }
                            >
                                <option value="MATERIAL">Material</option>
                                <option value="LABOR">Mano de obra</option>
                                <option value="ENERGY">Energía</option>
                                <option value="OVERHEAD">Indirecto</option>
                                <option value="COPRODUCT_CREDIT">
                                    Crédito coproducto
                                </option>
                            </select>
                        </label>
                        <label>
                            Artículo relacionado
                            <select
                                value={rateForm.data.part_id}
                                onChange={(e) =>
                                    rateForm.setData('part_id', e.target.value)
                                }
                            >
                                <option value="">No aplica</option>
                                {parts.map((part) => (
                                    <option
                                        key={value(part.id)}
                                        value={value(part.id)}
                                    >
                                        {value(part.code)} ·{' '}
                                        {value(part.description)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Centro de trabajo
                            <select
                                value={rateForm.data.work_center_id}
                                onChange={(e) =>
                                    rateForm.setData(
                                        'work_center_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Tarifa general</option>
                                {workCenters.map((center) => (
                                    <option
                                        key={value(center.id)}
                                        value={value(center.id)}
                                    >
                                        {value(center.code)} ·{' '}
                                        {value(center.description)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Costo unitario
                            <input
                                required
                                min="0"
                                step="0.000001"
                                type="number"
                                value={rateForm.data.unit_cost}
                                onChange={(e) =>
                                    rateForm.setData(
                                        'unit_cost',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Unidad base
                            <input
                                required
                                placeholder="kg, kWh, h, lote"
                                value={rateForm.data.unit}
                                onChange={(e) =>
                                    rateForm.setData('unit', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Vigente desde
                            <input
                                required
                                type="date"
                                value={rateForm.data.effective_from}
                                onChange={(e) =>
                                    rateForm.setData(
                                        'effective_from',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <button
                        className="primary-button"
                        disabled={rateForm.processing}
                    >
                        <BadgeDollarSign /> Guardar tarifa
                    </button>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'entry'}
                onOpenChange={(open) => !open && setDialog(null)}
                title="Registrar costo real"
                description="Agrega energía, indirectos, materiales extraordinarios o el valor recuperable de coproductos al lote."
            >
                <form className="mes-form" onSubmit={submitEntry}>
                    <div className="form-grid">
                        <label>
                            Orden
                            <select
                                required
                                value={entryForm.data.production_order_id}
                                onChange={(e) =>
                                    entryForm.setData(
                                        'production_order_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccione</option>
                                {orders
                                    .filter(
                                        (order) =>
                                            order.cost_status !== 'CLOSED',
                                    )
                                    .map((order) => (
                                        <option
                                            key={value(order.id)}
                                            value={value(order.id)}
                                        >
                                            {value(order.number)} ·{' '}
                                            {value(order.part_code)}
                                        </option>
                                    ))}
                            </select>
                        </label>
                        <label>
                            Tarifa
                            <select
                                required
                                value={entryForm.data.cost_rate_id}
                                onChange={(e) =>
                                    entryForm.setData(
                                        'cost_rate_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccione</option>
                                {rates.map((rate) => (
                                    <option
                                        key={value(rate.id)}
                                        value={value(rate.id)}
                                    >
                                        {value(rate.code)} ·{' '}
                                        {value(rate.category)} ·{' '}
                                        {money(rate.unit_cost)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Cantidad real
                            <input
                                required
                                min="0.0001"
                                step="0.0001"
                                type="number"
                                value={entryForm.data.quantity}
                                onChange={(e) =>
                                    entryForm.setData(
                                        'quantity',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Fecha
                            <input
                                required
                                type="datetime-local"
                                value={entryForm.data.occurred_at}
                                onChange={(e) =>
                                    entryForm.setData(
                                        'occurred_at',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <label>
                        Concepto / referencia
                        <input
                            required
                            value={entryForm.data.description}
                            onChange={(e) =>
                                entryForm.setData('description', e.target.value)
                            }
                        />
                    </label>
                    <button
                        className="primary-button"
                        disabled={entryForm.processing}
                    >
                        <ReceiptText /> Registrar movimiento
                    </button>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'close'}
                onOpenChange={(open) => !open && setDialog(null)}
                title="Cerrar costo del lote"
                description="El cierre exige una orden completada y protege el cálculo contra nuevas capturas."
            >
                <form className="mes-form" onSubmit={submitClose}>
                    <label>
                        Conciliación y evidencia de revisión
                        <textarea
                            required
                            minLength={10}
                            value={closeForm.data.closure_notes}
                            onChange={(e) =>
                                closeForm.setData(
                                    'closure_notes',
                                    e.target.value,
                                )
                            }
                        />
                    </label>
                    <button
                        className="primary-button"
                        disabled={closeForm.processing}
                    >
                        <LockKeyhole /> Cerrar costo real
                    </button>
                </form>
            </MesRecordDialog>
        </div>
    );
}
