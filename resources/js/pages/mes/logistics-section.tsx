import { type FormEvent, type ReactNode, useState } from 'react';
import { router, useForm, usePage } from '@inertiajs/react';
import {
    CircleCheck,
    ClipboardList,
    PackageCheck,
    Plus,
    RotateCcw,
    ShieldAlert,
    Truck,
    UserRoundPlus,
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
    icon: typeof Truck;
    label: string;
    metric: unknown;
    detail: string;
}) {
    return (
        <article className="phase-metric">
            <Icon />
            <span>{label}</span>
            <strong>{value(metric, '0')}</strong>
            <small>{detail}</small>
        </article>
    );
}

function Card({
    title,
    action,
    children,
}: {
    title: string;
    action?: ReactNode;
    children: ReactNode;
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

export function LogisticsSection({ data }: { data: Props }) {
    const permissions = usePage().props.auth.user?.permissions ?? [];
    const canWrite = permissions.includes('logistics.write');
    const canApprove = permissions.includes('logistics.approve');
    const summary = (data.logisticsSummary ?? {}) as Item;
    const customers = (data.customers ?? []) as Item[];
    const parts = (data.finishedParts ?? []) as Item[];
    const orders = (data.salesOrders ?? []) as Item[];
    const allocations = (data.allocations ?? []) as Item[];
    const shipments = (data.shipments ?? []) as Item[];
    const shipmentItems = (data.shipmentItems ?? []) as Item[];
    const returns = (data.customerReturns ?? []) as Item[];
    const recalls = (data.recalls ?? []) as Item[];

    const [dialog, setDialog] = useState<
        'customer' | 'order' | 'shipment' | 'return' | 'recall' | 'close' | null
    >(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const customerForm = useForm({
        code: '',
        name: '',
        customer_type: 'INDUSTRIAL',
        tax_id: '',
        contact_name: '',
        email: '',
        phone: '',
    });
    const orderForm = useForm({
        customer_id: '',
        part_id: '',
        quantity: '',
        priority: 'NORMAL',
        requested_at: new Date().toISOString().slice(0, 10),
        promised_at: '',
        notes: '',
    });
    const shipmentForm = useForm({
        carrier: '',
        tracking_number: '',
        vehicle: '',
        seal: '',
    });
    const returnForm = useForm({
        shipment_id: '',
        container_id: '',
        quantity: '',
        reason: '',
        disposition: 'QUARANTINE',
        notes: '',
    });
    const recallForm = useForm({
        type: 'MOCK',
        reference_type: 'CONTAINER',
        reference: '',
        reason: '',
    });
    const closeForm = useForm({ closure_notes: '' });

    const done = (reset: () => void) => {
        reset();
        setDialog(null);
        setSelectedId(null);
    };

    const submitCustomer = (event: FormEvent) => {
        event.preventDefault();
        customerForm.post('/mes/logistics/customers', {
            preserveScroll: true,
            onSuccess: () => done(() => customerForm.reset()),
        });
    };
    const submitOrder = (event: FormEvent) => {
        event.preventDefault();
        orderForm.post('/mes/logistics/orders', {
            preserveScroll: true,
            onSuccess: () => done(() => orderForm.reset()),
        });
    };
    const submitShipment = (event: FormEvent) => {
        event.preventDefault();
        if (!selectedId) return;
        shipmentForm.post(`/mes/logistics/orders/${selectedId}/ship`, {
            preserveScroll: true,
            onSuccess: () => done(() => shipmentForm.reset()),
        });
    };
    const submitReturn = (event: FormEvent) => {
        event.preventDefault();
        returnForm.post('/mes/logistics/returns', {
            preserveScroll: true,
            onSuccess: () => done(() => returnForm.reset()),
        });
    };
    const submitRecall = (event: FormEvent) => {
        event.preventDefault();
        recallForm.post('/mes/logistics/recalls', {
            preserveScroll: true,
            onSuccess: () => done(() => recallForm.reset()),
        });
    };
    const submitClose = (event: FormEvent) => {
        event.preventDefault();
        if (!selectedId) return;
        closeForm.patch(`/mes/logistics/recalls/${selectedId}/close`, {
            preserveScroll: true,
            onSuccess: () => done(() => closeForm.reset()),
        });
    };

    const availableReturnItems = shipmentItems.filter(
        (item) => value(item.shipment_id, '') === returnForm.data.shipment_id,
    );

    return (
        <div className="stack-xl">
            <div className="phase-metrics">
                <Metric
                    icon={ClipboardList}
                    label="Por preparar"
                    metric={summary.draftOrders}
                    detail="Borrador o en surtido"
                />
                <Metric
                    icon={PackageCheck}
                    label="Listos"
                    metric={summary.readyOrders}
                    detail="Esperando embarque"
                />
                <Metric
                    icon={Truck}
                    label="Embarques hoy"
                    metric={summary.shippedToday}
                    detail="Salidas confirmadas"
                />
                <Metric
                    icon={RotateCcw}
                    label="Devoluciones"
                    metric={summary.openReturns}
                    detail="Pendientes de disposición"
                />
                <Metric
                    icon={ShieldAlert}
                    label="Retiros activos"
                    metric={summary.activeRecalls}
                    detail="Simulacros o eventos reales"
                />
            </div>

            <div className="record-actions">
                {canWrite && (
                    <>
                        <button
                            className="secondary-button"
                            onClick={() => setDialog('customer')}
                            type="button"
                        >
                            <UserRoundPlus /> Nuevo cliente
                        </button>
                        <button
                            className="primary-button"
                            onClick={() => setDialog('order')}
                            type="button"
                        >
                            <Plus /> Nuevo pedido
                        </button>
                        <button
                            className="secondary-button"
                            onClick={() => setDialog('return')}
                            type="button"
                        >
                            <RotateCcw /> Registrar devolución
                        </button>
                    </>
                )}
                {canApprove && (
                    <button
                        className="danger-button"
                        onClick={() => setDialog('recall')}
                        type="button"
                    >
                        <ShieldAlert /> Iniciar retiro
                    </button>
                )}
            </div>

            <Card title="Pedidos y preparación">
                <Table
                    headers={[
                        'Pedido',
                        'Cliente',
                        'Artículo',
                        'Cantidad',
                        'Promesa',
                        'Estado',
                        'Acción',
                    ]}
                    rows={orders.map((order) => [
                        value(order.number),
                        value(order.customer),
                        <span key="part">
                            <b>{value(order.part_code)}</b>
                            <br />
                            <small>{value(order.part_name)}</small>
                        </span>,
                        `${value(order.ordered_quantity)} ${value(order.unit)}`,
                        date(order.promised_at ?? order.requested_at),
                        <Status key="status">{order.status}</Status>,
                        <div className="inline-actions" key="actions">
                            {canApprove && order.status === 'DRAFT' && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.patch(
                                            `/mes/logistics/orders/${value(order.id)}/allocate`,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    Reservar FEFO
                                </button>
                            )}
                            {canApprove && order.status === 'READY' && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedId(Number(order.id));
                                        setDialog('shipment');
                                    }}
                                >
                                    Embarcar
                                </button>
                            )}
                        </div>,
                    ])}
                />
            </Card>

            <Card title="Lista de surtido FEFO">
                <Table
                    headers={[
                        'Pedido',
                        'Contenedor',
                        'Ubicación',
                        'Caducidad',
                        'Cantidad',
                        'Estado',
                        'Confirmar',
                    ]}
                    rows={allocations.map((allocation) => [
                        value(allocation.order_number),
                        value(allocation.serial),
                        value(allocation.location),
                        date(allocation.expires_at),
                        `${value(allocation.quantity)} ${value(allocation.unit)}`,
                        <Status key="status">{allocation.status}</Status>,
                        canWrite && allocation.status === 'ALLOCATED' ? (
                            <button
                                className="small-button"
                                key="pick"
                                type="button"
                                onClick={() =>
                                    router.patch(
                                        `/mes/logistics/allocations/${value(allocation.id)}/pick`,
                                        {},
                                        { preserveScroll: true },
                                    )
                                }
                            >
                                <CircleCheck /> Surtido
                            </button>
                        ) : (
                            value(allocation.picked_by)
                        ),
                    ])}
                />
            </Card>

            <div className="mes-two-column">
                <Card title="Embarques confirmados">
                    <Table
                        headers={[
                            'Embarque',
                            'Pedido',
                            'Cliente',
                            'Transportista',
                            'Salida',
                            'Estado',
                        ]}
                        rows={shipments.map((shipment) => [
                            value(shipment.number),
                            value(shipment.order_number),
                            value(shipment.customer),
                            value(shipment.carrier),
                            date(shipment.shipped_at),
                            <Status key="status">{shipment.status}</Status>,
                        ])}
                    />
                </Card>
                <Card title="Devoluciones de cliente">
                    <Table
                        headers={[
                            'Folio',
                            'Cliente',
                            'Contenedor',
                            'Motivo',
                            'Disposición',
                            'Estado',
                        ]}
                        rows={returns.map((item) => [
                            value(item.number),
                            value(item.customer),
                            value(item.container),
                            value(item.reason),
                            value(item.disposition),
                            <Status key="status">{item.status}</Status>,
                        ])}
                    />
                </Card>
            </div>

            <Card title="Retiros y simulacros de trazabilidad">
                <Table
                    headers={[
                        'Folio',
                        'Tipo',
                        'Referencia',
                        'Contenedores',
                        'Clientes',
                        'Estado',
                        'Acción',
                    ]}
                    rows={recalls.map((recall) => [
                        value(recall.number),
                        value(recall.type),
                        `${value(recall.reference_type)} · ${value(recall.reference)}`,
                        value(recall.impacted_containers, '0'),
                        value(recall.impacted_customers, '0'),
                        <Status key="status">{recall.status}</Status>,
                        canApprove && recall.status !== 'CLOSED' ? (
                            <button
                                className="small-button"
                                key="close"
                                type="button"
                                onClick={() => {
                                    setSelectedId(Number(recall.id));
                                    setDialog('close');
                                }}
                            >
                                Cerrar investigación
                            </button>
                        ) : (
                            '—'
                        ),
                    ])}
                />
            </Card>

            <MesRecordDialog
                open={dialog === 'customer'}
                onOpenChange={(open) => !open && setDialog(null)}
                title="Nuevo cliente"
                description="Crea el destino comercial que recibirá pedidos y lotes trazables."
            >
                <form className="mes-form" onSubmit={submitCustomer}>
                    <div className="form-grid">
                        <label>
                            Código
                            <input
                                required
                                value={customerForm.data.code}
                                onChange={(e) =>
                                    customerForm.setData('code', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Razón social / nombre
                            <input
                                required
                                value={customerForm.data.name}
                                onChange={(e) =>
                                    customerForm.setData('name', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Tipo
                            <select
                                value={customerForm.data.customer_type}
                                onChange={(e) =>
                                    customerForm.setData(
                                        'customer_type',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="INDUSTRIAL">Industrial</option>
                                <option value="AGRICULTURAL">Agrícola</option>
                                <option value="RESEARCH">Investigación</option>
                                <option value="DISTRIBUTOR">
                                    Distribuidor
                                </option>
                            </select>
                        </label>
                        <label>
                            RFC / identificación fiscal
                            <input
                                value={customerForm.data.tax_id}
                                onChange={(e) =>
                                    customerForm.setData(
                                        'tax_id',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Contacto
                            <input
                                value={customerForm.data.contact_name}
                                onChange={(e) =>
                                    customerForm.setData(
                                        'contact_name',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Correo
                            <input
                                type="email"
                                value={customerForm.data.email}
                                onChange={(e) =>
                                    customerForm.setData(
                                        'email',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <button
                        className="primary-button"
                        disabled={customerForm.processing}
                    >
                        Guardar cliente
                    </button>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'order'}
                onOpenChange={(open) => !open && setDialog(null)}
                title="Nuevo pedido de salida"
                description="Define cliente, producto y fecha compromiso; la reserva se realiza después por FEFO."
            >
                <form className="mes-form" onSubmit={submitOrder}>
                    <div className="form-grid">
                        <label>
                            Cliente
                            <select
                                required
                                value={orderForm.data.customer_id}
                                onChange={(e) =>
                                    orderForm.setData(
                                        'customer_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccione</option>
                                {customers.map((customer) => (
                                    <option
                                        key={value(customer.id)}
                                        value={value(customer.id)}
                                    >
                                        {value(customer.code)} ·{' '}
                                        {value(customer.name)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Producto terminado
                            <select
                                required
                                value={orderForm.data.part_id}
                                onChange={(e) =>
                                    orderForm.setData('part_id', e.target.value)
                                }
                            >
                                <option value="">Seleccione</option>
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
                            Cantidad
                            <input
                                required
                                min="0.0001"
                                step="0.0001"
                                type="number"
                                value={orderForm.data.quantity}
                                onChange={(e) =>
                                    orderForm.setData(
                                        'quantity',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Prioridad
                            <select
                                value={orderForm.data.priority}
                                onChange={(e) =>
                                    orderForm.setData(
                                        'priority',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="LOW">Baja</option>
                                <option value="NORMAL">Normal</option>
                                <option value="HIGH">Alta</option>
                                <option value="CRITICAL">Crítica</option>
                            </select>
                        </label>
                        <label>
                            Fecha solicitada
                            <input
                                required
                                type="date"
                                value={orderForm.data.requested_at}
                                onChange={(e) =>
                                    orderForm.setData(
                                        'requested_at',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Fecha promesa
                            <input
                                type="date"
                                value={orderForm.data.promised_at}
                                onChange={(e) =>
                                    orderForm.setData(
                                        'promised_at',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <label>
                        Notas
                        <textarea
                            value={orderForm.data.notes}
                            onChange={(e) =>
                                orderForm.setData('notes', e.target.value)
                            }
                        />
                    </label>
                    <button
                        className="primary-button"
                        disabled={orderForm.processing}
                    >
                        Crear pedido
                    </button>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'shipment'}
                onOpenChange={(open) => !open && setDialog(null)}
                title="Confirmar embarque"
                description="Esta acción descuenta el inventario y fija la relación lote–pedido–cliente."
            >
                <form className="mes-form" onSubmit={submitShipment}>
                    <div className="form-grid">
                        <label>
                            Transportista
                            <input
                                required
                                value={shipmentForm.data.carrier}
                                onChange={(e) =>
                                    shipmentForm.setData(
                                        'carrier',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Guía / rastreo
                            <input
                                value={shipmentForm.data.tracking_number}
                                onChange={(e) =>
                                    shipmentForm.setData(
                                        'tracking_number',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Vehículo
                            <input
                                value={shipmentForm.data.vehicle}
                                onChange={(e) =>
                                    shipmentForm.setData(
                                        'vehicle',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Sello
                            <input
                                value={shipmentForm.data.seal}
                                onChange={(e) =>
                                    shipmentForm.setData('seal', e.target.value)
                                }
                            />
                        </label>
                    </div>
                    <button
                        className="primary-button"
                        disabled={shipmentForm.processing}
                    >
                        Confirmar salida
                    </button>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'return'}
                onOpenChange={(open) => !open && setDialog(null)}
                title="Devolución de cliente"
                description="Registra el lote devuelto y lo pone inmediatamente en cuarentena."
            >
                <form className="mes-form" onSubmit={submitReturn}>
                    <div className="form-grid">
                        <label>
                            Embarque
                            <select
                                required
                                value={returnForm.data.shipment_id}
                                onChange={(e) => {
                                    returnForm.setData({
                                        ...returnForm.data,
                                        shipment_id: e.target.value,
                                        container_id: '',
                                    });
                                }}
                            >
                                <option value="">Seleccione</option>
                                {shipments.map((shipment) => (
                                    <option
                                        key={value(shipment.id)}
                                        value={value(shipment.id)}
                                    >
                                        {value(shipment.number)} ·{' '}
                                        {value(shipment.customer)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Contenedor
                            <select
                                required
                                value={returnForm.data.container_id}
                                onChange={(e) =>
                                    returnForm.setData(
                                        'container_id',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccione</option>
                                {availableReturnItems.map((item) => (
                                    <option
                                        key={value(item.id)}
                                        value={value(item.container_id)}
                                    >
                                        {value(item.serial)} ·{' '}
                                        {value(item.quantity)}{' '}
                                        {value(item.unit)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Cantidad devuelta
                            <input
                                required
                                min="0.0001"
                                step="0.0001"
                                type="number"
                                value={returnForm.data.quantity}
                                onChange={(e) =>
                                    returnForm.setData(
                                        'quantity',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Disposición inicial
                            <select
                                value={returnForm.data.disposition}
                                onChange={(e) =>
                                    returnForm.setData(
                                        'disposition',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="QUARANTINE">Cuarentena</option>
                                <option value="REWORK">Reproceso</option>
                                <option value="DESTROY">Destrucción</option>
                                <option value="CREDIT">Nota de crédito</option>
                            </select>
                        </label>
                    </div>
                    <label>
                        Motivo
                        <input
                            required
                            value={returnForm.data.reason}
                            onChange={(e) =>
                                returnForm.setData('reason', e.target.value)
                            }
                        />
                    </label>
                    <button
                        className="primary-button"
                        disabled={returnForm.processing}
                    >
                        Registrar y bloquear
                    </button>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'recall'}
                onOpenChange={(open) => !open && setDialog(null)}
                title="Iniciar retiro trazable"
                description="Busca el lote, recorre su genealogía hacia delante e identifica embarques y clientes afectados."
            >
                <form className="mes-form" onSubmit={submitRecall}>
                    <div className="form-grid">
                        <label>
                            Tipo de ejercicio
                            <select
                                value={recallForm.data.type}
                                onChange={(e) =>
                                    recallForm.setData('type', e.target.value)
                                }
                            >
                                <option value="MOCK">Simulacro</option>
                                <option value="REAL">Retiro real</option>
                            </select>
                        </label>
                        <label>
                            Buscar por
                            <select
                                value={recallForm.data.reference_type}
                                onChange={(e) =>
                                    recallForm.setData(
                                        'reference_type',
                                        e.target.value,
                                    )
                                }
                            >
                                <option value="CONTAINER">Contenedor</option>
                                <option value="LOT">Lote de producción</option>
                                <option value="SUPPLIER_LOT">
                                    Lote de proveedor
                                </option>
                            </select>
                        </label>
                        <label>
                            Referencia exacta
                            <input
                                required
                                value={recallForm.data.reference}
                                onChange={(e) =>
                                    recallForm.setData(
                                        'reference',
                                        e.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <label>
                        Motivo
                        <textarea
                            required
                            value={recallForm.data.reason}
                            onChange={(e) =>
                                recallForm.setData('reason', e.target.value)
                            }
                        />
                    </label>
                    <button
                        className="danger-button"
                        disabled={recallForm.processing}
                    >
                        <ShieldAlert /> Trazar y bloquear alcance
                    </button>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'close'}
                onOpenChange={(open) => !open && setDialog(null)}
                title="Cerrar investigación de retiro"
                description="Documenta el resultado. Los lotes permanecen retenidos hasta que Calidad defina su disposición."
            >
                <form className="mes-form" onSubmit={submitClose}>
                    <label>
                        Resultado y evidencia
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
                        Cerrar investigación
                    </button>
                </form>
            </MesRecordDialog>
        </div>
    );
}
