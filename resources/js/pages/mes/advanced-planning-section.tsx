import { FormEvent, useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import {
    CalendarRange,
    Dna,
    PackagePlus,
    Repeat2,
    Waypoints,
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
    )
        return String(value);

    return JSON.stringify(value);
};
const dateTime = (value: unknown) =>
    value ? new Date(text(value, '')).toLocaleString('es-MX') : '—';

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

export function AdvancedPlanningSection({ data }: { data: Props }) {
    const [campaignOpen, setCampaignOpen] = useState(false);
    const [assignmentOpen, setAssignmentOpen] = useState(false);
    const [changeoverOpen, setChangeoverOpen] = useState(false);
    const [alternateOpen, setAlternateOpen] = useState(false);
    const [biologicalOpen, setBiologicalOpen] = useState(false);
    const [supplyOpen, setSupplyOpen] = useState(false);
    const campaigns = (data.planningCampaigns ?? []) as Item[];
    const orders = (data.orders ?? []) as Item[];
    const changeovers = (data.changeoverRules ?? []) as Item[];
    const workCenterOptions = (data.workCenterOptions ?? []) as Item[];
    const biologicalRules = (data.biologicalRules ?? []) as Item[];
    const supplies = (data.materialSupplyEvents ?? []) as Item[];
    const allocations = (data.planningMaterialAllocations ?? []) as Item[];
    const occupancies = (data.planningOccupancies ?? []) as Item[];
    const parts = (data.planningParts ?? []) as Item[];
    const operations = (data.planningOperations ?? []) as Item[];
    const workCenters = (data.workCenters ?? []) as Item[];
    const planningRun = (data.planningRun ?? {}) as Item;

    const campaignForm = useForm({
        code: '',
        name: '',
        family: '',
        part_id: '',
        priority: '50',
        planned_start: '',
        planned_end: '',
        notes: '',
    });
    const assignmentForm = useForm({
        order_id: '',
        campaign_id: '',
        reason: 'Asignación para secuenciar la corrida de producción.',
    });
    const changeoverForm = useForm({
        work_center_id: '',
        from_family: '*',
        to_family: '',
        setup_minutes: '30',
        cleaning_required: true,
        active: true,
        notes: '',
    });
    const biologicalForm = useForm({
        part_id: '',
        operation_id: '',
        minimum_age_hours: '0',
        target_age_hours: '',
        maximum_age_hours: '',
        active: true,
        rationale: '',
    });
    const supplyForm = useForm({
        part_id: '',
        quantity: '',
        available_at: '',
        status: 'PLANNED',
        source: '',
        reference: '',
        notes: '',
    });
    const alternateForm = useForm({
        operation_id: '',
        work_center_id: '',
        priority: '50',
        efficiency_factor: '1',
        qualification_status: 'PENDING',
        valid_from: '',
        valid_to: '',
        active: true,
        notes: '',
    });

    const routeOperations = useMemo(
        () =>
            operations.filter(
                (operation) =>
                    String(operation.part_id) === biologicalForm.data.part_id,
            ),
        [operations, biologicalForm.data.part_id],
    );
    const uniqueOperations = useMemo(
        () =>
            Array.from(
                new Map(
                    operations.map((operation) => [
                        String(operation.operation_id),
                        operation,
                    ]),
                ).values(),
            ),
        [operations],
    );
    const selectedAlternateOperation = uniqueOperations.find(
        (operation) =>
            String(operation.operation_id) === alternateForm.data.operation_id,
    );

    const submitCampaign = (event: FormEvent) => {
        event.preventDefault();
        campaignForm.post('/mes/planning/campaigns', {
            preserveScroll: true,
            onSuccess: () => {
                campaignForm.reset();
                setCampaignOpen(false);
            },
        });
    };
    const assignCampaign = (event: FormEvent) => {
        event.preventDefault();
        assignmentForm.patch(
            `/mes/planning/orders/${assignmentForm.data.order_id}/campaign`,
            {
                preserveScroll: true,
                onSuccess: () => setAssignmentOpen(false),
            },
        );
    };
    const submitChangeover = (event: FormEvent) => {
        event.preventDefault();
        changeoverForm.put('/mes/planning/changeovers', {
            preserveScroll: true,
            onSuccess: () => setChangeoverOpen(false),
        });
    };
    const submitBiological = (event: FormEvent) => {
        event.preventDefault();
        biologicalForm.put('/mes/planning/biological-rules', {
            preserveScroll: true,
            onSuccess: () => setBiologicalOpen(false),
        });
    };
    const submitSupply = (event: FormEvent) => {
        event.preventDefault();
        supplyForm.post('/mes/planning/material-supplies', {
            preserveScroll: true,
            onSuccess: () => {
                supplyForm.reset();
                setSupplyOpen(false);
            },
        });
    };
    const submitAlternate = (event: FormEvent) => {
        event.preventDefault();
        alternateForm.put('/mes/planning/work-center-options', {
            preserveScroll: true,
            onSuccess: () => {
                alternateForm.reset();
                setAlternateOpen(false);
            },
        });
    };

    const errorMessage = (errors: Record<string, string>) =>
        Object.keys(errors).length > 0 ? (
            <p className="form-error">{Object.values(errors).join(' ')}</p>
        ) : null;

    return (
        <div className="stack-lg">
            <div className="readiness-grid">
                <article>
                    <CalendarRange />
                    <span>Campañas programadas</span>
                    <strong>
                        {text(planningRun.campaigns_scheduled, '0')}
                    </strong>
                </article>
                <article>
                    <Repeat2 />
                    <span>Minutos de cambio</span>
                    <strong>{text(planningRun.changeover_minutes, '0')}</strong>
                </article>
                <article>
                    <PackagePlus />
                    <span>Faltantes de material</span>
                    <strong>{text(planningRun.material_shortages, '0')}</strong>
                </article>
                <article>
                    <Dna />
                    <span>Violaciones biológicas</span>
                    <strong>
                        {text(planningRun.biological_violations, '0')}
                    </strong>
                </article>
                <article>
                    <Waypoints />
                    <span>Centros alternos usados</span>
                    <strong>
                        {text(planningRun.alternate_centers_used, '0')}
                    </strong>
                </article>
            </div>

            <section className="mes-card">
                <header>
                    <div>
                        <span className="eyebrow">Planeación avanzada</span>
                        <h2>Campañas y restricciones BSF</h2>
                    </div>
                    <div className="inline-actions">
                        <button
                            className="secondary-button"
                            onClick={() => setAlternateOpen(true)}
                        >
                            <Waypoints /> Centro alterno
                        </button>
                        <button
                            className="secondary-button"
                            onClick={() => setSupplyOpen(true)}
                        >
                            <PackagePlus /> Suministro
                        </button>
                        <button
                            className="secondary-button"
                            onClick={() => setBiologicalOpen(true)}
                        >
                            <Dna /> Ventana
                        </button>
                        <button
                            className="secondary-button"
                            onClick={() => setChangeoverOpen(true)}
                        >
                            <Repeat2 /> Cambio
                        </button>
                        <button
                            className="primary-button"
                            onClick={() => setCampaignOpen(true)}
                        >
                            <CalendarRange /> Campaña
                        </button>
                    </div>
                </header>
                <p className="section-intro">
                    Agrupa órdenes, reserva limpieza y preparación, respeta la
                    edad biológica y no promete producción antes de que exista
                    material confirmado.
                </p>
                <Table
                    headers={[
                        'Campaña',
                        'Familia / producto',
                        'Ventana',
                        'Órdenes',
                        'Estado',
                    ]}
                    rows={campaigns.map((campaign) => [
                        <div>
                            <strong>{text(campaign.code)}</strong>
                            <small>{text(campaign.name)}</small>
                        </div>,
                        `${text(campaign.family)} · ${text(campaign.part_code, 'Todos')}`,
                        `${dateTime(campaign.planned_start)} – ${dateTime(campaign.planned_end)}`,
                        orders.filter(
                            (order) =>
                                String(order.campaign_id) ===
                                String(campaign.id),
                        ).length,
                        <Status value={campaign.status} />,
                    ])}
                />
            </section>

            <section className="mes-card">
                <header>
                    <h2>Asignación de órdenes</h2>
                </header>
                <Table
                    headers={[
                        'Orden',
                        'Producto',
                        'Prioridad',
                        'Campaña',
                        'Acción',
                    ]}
                    rows={orders
                        .filter((order) =>
                            ['PLANNED', 'RELEASED'].includes(
                                String(order.status),
                            ),
                        )
                        .map((order) => {
                            const part = (order.part ?? {}) as Item;
                            const campaign = campaigns.find(
                                (row) =>
                                    String(row.id) ===
                                    String(order.campaign_id),
                            );

                            return [
                                text(order.number),
                                text(part.code),
                                <Status value={order.priority} />,
                                campaign
                                    ? `${text(campaign.code)} · ${text(campaign.family)}`
                                    : 'Sin campaña',
                                <button
                                    className="small-button"
                                    onClick={() => {
                                        assignmentForm.setData({
                                            order_id: text(order.id, ''),
                                            campaign_id: text(
                                                order.campaign_id,
                                                '',
                                            ),
                                            reason: 'Asignación para secuenciar la corrida de producción.',
                                        });
                                        setAssignmentOpen(true);
                                    }}
                                >
                                    Asignar
                                </button>,
                            ];
                        })}
                />
            </section>

            <section className="mes-card">
                <header>
                    <h2>Cambios de campaña</h2>
                </header>
                <Table
                    headers={[
                        'Centro',
                        'Transición',
                        'Preparación',
                        'Limpieza',
                        'Estado',
                    ]}
                    rows={changeovers.map((rule) => [
                        `${text(rule.work_center)} · ${text(rule.work_center_name)}`,
                        `${text(rule.from_family)} → ${text(rule.to_family)}`,
                        `${text(rule.setup_minutes)} min`,
                        rule.cleaning_required ? 'Obligatoria' : 'No requerida',
                        rule.active ? 'Activa' : 'Inactiva',
                    ])}
                />
            </section>

            <section className="mes-card">
                <header>
                    <div>
                        <span className="eyebrow">Capacidad equivalente</span>
                        <h2>Centros alternos de operación</h2>
                    </div>
                    <button
                        className="secondary-button"
                        onClick={() => setAlternateOpen(true)}
                    >
                        <Waypoints /> Configurar
                    </button>
                </header>
                <p className="section-intro">
                    El plan compara únicamente centros aprobados y conserva el
                    centro elegido para que piso ejecute la misma asignación.
                </p>
                <Table
                    headers={[
                        'Operación',
                        'Ruta de centro',
                        'Eficiencia',
                        'Vigencia',
                        'Calificación',
                    ]}
                    rows={workCenterOptions.map((option) => [
                        `${text(option.operation_code)} · ${text(option.operation_name)}`,
                        `${text(option.primary_center)} → ${text(option.alternate_center)}`,
                        `${text(option.efficiency_factor)}× · prioridad ${text(option.priority)}`,
                        `${dateTime(option.valid_from)} – ${dateTime(option.valid_to)}`,
                        <div>
                            <Status value={option.qualification_status} />
                            <small>
                                {option.approved_at
                                    ? `${text(option.approved_by_name)} · ${dateTime(option.approved_at)}`
                                    : 'Pendiente de aprobación'}
                            </small>
                        </div>,
                    ])}
                />
            </section>

            <section className="mes-card">
                <header>
                    <h2>Ventanas biológicas aprobadas</h2>
                </header>
                <Table
                    headers={[
                        'Producto / etapa',
                        'Modo',
                        'Mínimo',
                        'Objetivo',
                        'Máximo',
                        'Aprobación',
                    ]}
                    rows={biologicalRules.map((rule) => [
                        <div>
                            <strong>{text(rule.part_code)}</strong>
                            <small>
                                {text(rule.operation_code)} ·{' '}
                                {text(rule.operation_name)}
                            </small>
                        </div>,
                        text(rule.scheduling_mode),
                        `${text(rule.minimum_age_hours)} h`,
                        `${text(rule.target_age_hours)} h`,
                        `${text(rule.maximum_age_hours)} h`,
                        <div>
                            <strong>{text(rule.approved_by_name)}</strong>
                            <small>{dateTime(rule.approved_at)}</small>
                        </div>,
                    ])}
                />
            </section>

            <section className="mes-card">
                <header>
                    <h2>Ocupación biológica vigente</h2>
                </header>
                <Table
                    headers={[
                        'Inicio',
                        'Fin',
                        'Orden',
                        'Etapa',
                        'Centro',
                        'Uso paralelo',
                    ]}
                    rows={occupancies.map((occupancy) => [
                        dateTime(occupancy.planned_start),
                        dateTime(occupancy.planned_end),
                        text(occupancy.order_number),
                        `${text(occupancy.operation)} · ${text(occupancy.operation_name)}`,
                        text(occupancy.work_center),
                        `${text(occupancy.capacity_units)} / ${text(occupancy.parallel_capacity)}`,
                    ])}
                />
            </section>

            <section className="mes-card">
                <header>
                    <h2>Disponibilidad futura de materiales</h2>
                </header>
                <Table
                    headers={[
                        'Disponible',
                        'Material',
                        'Cantidad',
                        'Origen',
                        'Referencia',
                        'Estado',
                    ]}
                    rows={supplies.map((supply) => [
                        dateTime(supply.available_at),
                        `${text(supply.part_code)} · ${text(supply.part_name)}`,
                        `${text(supply.quantity)} ${text(supply.unit)}`,
                        text(supply.source),
                        text(supply.reference),
                        <Status value={supply.status} />,
                    ])}
                />
            </section>

            <section className="mes-card">
                <header>
                    <h2>Material comprometido por el plan vigente</h2>
                </header>
                <Table
                    headers={[
                        'Orden',
                        'Material',
                        'Fuente',
                        'Cantidad',
                        'Disponible desde',
                    ]}
                    rows={allocations.map((allocation) => [
                        text(allocation.order_number),
                        `${text(allocation.part_code)} · ${text(allocation.part_name)}`,
                        allocation.source === 'ON_HAND'
                            ? 'Inventario actual'
                            : `Suministro · ${text(allocation.reference)}`,
                        text(allocation.quantity),
                        dateTime(allocation.available_at),
                    ])}
                />
            </section>

            <MesRecordDialog
                open={alternateOpen}
                onOpenChange={setAlternateOpen}
                title="Centro alterno de operación"
                description="Registra una línea equivalente. Solo el estado Aprobado permite que el plan la seleccione automáticamente."
            >
                <form className="mes-form" onSubmit={submitAlternate}>
                    <div className="form-grid">
                        <label>
                            Operación
                            <select
                                required
                                value={alternateForm.data.operation_id}
                                onChange={(event) => {
                                    alternateForm.setData(
                                        'operation_id',
                                        event.target.value,
                                    );
                                    alternateForm.setData('work_center_id', '');
                                }}
                            >
                                <option value="">Seleccionar</option>
                                {uniqueOperations.map((operation) => (
                                    <option
                                        key={String(operation.operation_id)}
                                        value={String(operation.operation_id)}
                                    >
                                        {text(operation.operation_code)} ·{' '}
                                        {text(operation.operation_name)} ·
                                        primario{' '}
                                        {text(operation.primary_work_center)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Centro alterno
                            <select
                                required
                                value={alternateForm.data.work_center_id}
                                onChange={(event) =>
                                    alternateForm.setData(
                                        'work_center_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccionar</option>
                                {workCenters
                                    .filter(
                                        (center) =>
                                            String(center.id) !==
                                            String(
                                                selectedAlternateOperation?.primary_work_center_id,
                                            ),
                                    )
                                    .map((center) => (
                                        <option
                                            key={String(center.id)}
                                            value={String(center.id)}
                                        >
                                            {text(center.code)} ·{' '}
                                            {text(center.description)}
                                        </option>
                                    ))}
                            </select>
                        </label>
                        <label>
                            Prioridad de selección
                            <input
                                required
                                type="number"
                                min="1"
                                max="999"
                                value={alternateForm.data.priority}
                                onChange={(event) =>
                                    alternateForm.setData(
                                        'priority',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Factor de eficiencia
                            <input
                                required
                                type="number"
                                min="0.1"
                                max="10"
                                step="0.01"
                                value={alternateForm.data.efficiency_factor}
                                onChange={(event) =>
                                    alternateForm.setData(
                                        'efficiency_factor',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Calificación
                            <select
                                value={alternateForm.data.qualification_status}
                                onChange={(event) =>
                                    alternateForm.setData(
                                        'qualification_status',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="PENDING">Pendiente</option>
                                <option value="APPROVED">Aprobado</option>
                                <option value="SUSPENDED">Suspendido</option>
                            </select>
                        </label>
                        <label>
                            Vigente desde
                            <input
                                type="datetime-local"
                                value={alternateForm.data.valid_from}
                                onChange={(event) =>
                                    alternateForm.setData(
                                        'valid_from',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Vigente hasta
                            <input
                                type="datetime-local"
                                value={alternateForm.data.valid_to}
                                onChange={(event) =>
                                    alternateForm.setData(
                                        'valid_to',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <label>
                        Justificación y evidencia
                        <textarea
                            required
                            value={alternateForm.data.notes}
                            onChange={(event) =>
                                alternateForm.setData(
                                    'notes',
                                    event.target.value,
                                )
                            }
                            placeholder="Capacidad equivalente, calificación y restricciones de uso."
                        />
                    </label>
                    {errorMessage(alternateForm.errors)}
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={alternateForm.processing}
                        >
                            Guardar centro alterno
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={campaignOpen}
                onOpenChange={setCampaignOpen}
                title="Nueva campaña productiva"
                description="Define la familia que agrupa órdenes y la prioridad usada para reducir cambios y limpiezas."
            >
                <form className="mes-form" onSubmit={submitCampaign}>
                    <div className="form-grid">
                        <label>
                            Código
                            <input
                                required
                                value={campaignForm.data.code}
                                onChange={(event) =>
                                    campaignForm.setData(
                                        'code',
                                        event.target.value,
                                    )
                                }
                                placeholder="CMP-LARVA-2027"
                            />
                        </label>
                        <label>
                            Nombre
                            <input
                                required
                                value={campaignForm.data.name}
                                onChange={(event) =>
                                    campaignForm.setData(
                                        'name',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Familia sanitaria
                            <input
                                required
                                value={campaignForm.data.family}
                                onChange={(event) =>
                                    campaignForm.setData(
                                        'family',
                                        event.target.value,
                                    )
                                }
                                placeholder="LARVA_FRESCA"
                            />
                        </label>
                        <label>
                            Producto
                            <select
                                value={campaignForm.data.part_id}
                                onChange={(event) =>
                                    campaignForm.setData(
                                        'part_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Todos los productos</option>
                                {parts.map((part) => (
                                    <option
                                        key={String(part.id)}
                                        value={String(part.id)}
                                    >
                                        {text(part.code)} ·{' '}
                                        {text(part.description)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Prioridad de campaña
                            <input
                                required
                                type="number"
                                min="1"
                                max="999"
                                value={campaignForm.data.priority}
                                onChange={(event) =>
                                    campaignForm.setData(
                                        'priority',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Inicio previsto
                            <input
                                type="datetime-local"
                                value={campaignForm.data.planned_start}
                                onChange={(event) =>
                                    campaignForm.setData(
                                        'planned_start',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Fin previsto
                            <input
                                type="datetime-local"
                                value={campaignForm.data.planned_end}
                                onChange={(event) =>
                                    campaignForm.setData(
                                        'planned_end',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Notas
                            <input
                                value={campaignForm.data.notes}
                                onChange={(event) =>
                                    campaignForm.setData(
                                        'notes',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    {errorMessage(campaignForm.errors)}
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={campaignForm.processing}
                        >
                            Crear campaña
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={assignmentOpen}
                onOpenChange={setAssignmentOpen}
                title="Asignar campaña"
                description="La asignación cambia la secuencia del siguiente cálculo, pero conserva las corridas anteriores."
            >
                <form className="mes-form" onSubmit={assignCampaign}>
                    <label>
                        Campaña
                        <select
                            value={assignmentForm.data.campaign_id}
                            onChange={(event) =>
                                assignmentForm.setData(
                                    'campaign_id',
                                    event.target.value,
                                )
                            }
                        >
                            <option value="">Sin campaña</option>
                            {campaigns.map((campaign) => (
                                <option
                                    key={String(campaign.id)}
                                    value={String(campaign.id)}
                                >
                                    {text(campaign.code)} ·{' '}
                                    {text(campaign.family)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Motivo
                        <textarea
                            required
                            value={assignmentForm.data.reason}
                            onChange={(event) =>
                                assignmentForm.setData(
                                    'reason',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    {errorMessage(assignmentForm.errors)}
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={assignmentForm.processing}
                        >
                            Guardar asignación
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={changeoverOpen}
                onOpenChange={setChangeoverOpen}
                title="Regla de cambio de campaña"
                description="Reserva minutos reales de preparación o limpieza antes de iniciar la nueva familia. Usa * como familia origen para una regla general."
            >
                <form className="mes-form" onSubmit={submitChangeover}>
                    <div className="form-grid">
                        <label>
                            Centro de trabajo
                            <select
                                required
                                value={changeoverForm.data.work_center_id}
                                onChange={(event) =>
                                    changeoverForm.setData(
                                        'work_center_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccionar</option>
                                {workCenters.map((center) => (
                                    <option
                                        key={String(center.id)}
                                        value={String(center.id)}
                                    >
                                        {text(center.code)} ·{' '}
                                        {text(center.description)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Familia origen
                            <input
                                required
                                value={changeoverForm.data.from_family}
                                onChange={(event) =>
                                    changeoverForm.setData(
                                        'from_family',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Familia destino
                            <input
                                required
                                value={changeoverForm.data.to_family}
                                onChange={(event) =>
                                    changeoverForm.setData(
                                        'to_family',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Minutos de preparación
                            <input
                                required
                                type="number"
                                min="0"
                                max="1440"
                                value={changeoverForm.data.setup_minutes}
                                onChange={(event) =>
                                    changeoverForm.setData(
                                        'setup_minutes',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label className="checkbox-field">
                            <input
                                type="checkbox"
                                checked={changeoverForm.data.cleaning_required}
                                onChange={(event) =>
                                    changeoverForm.setData(
                                        'cleaning_required',
                                        event.target.checked,
                                    )
                                }
                            />
                            Requiere limpieza sanitaria
                        </label>
                        <label>
                            Notas
                            <input
                                value={changeoverForm.data.notes}
                                onChange={(event) =>
                                    changeoverForm.setData(
                                        'notes',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    {errorMessage(changeoverForm.errors)}
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={changeoverForm.processing}
                        >
                            Guardar regla
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={biologicalOpen}
                onOpenChange={setBiologicalOpen}
                title="Aprobar ventana biológica"
                description="Define la edad mínima, objetivo y máxima desde el inicio de la orden. La corrida se detiene si no puede cumplirla."
            >
                <form className="mes-form" onSubmit={submitBiological}>
                    <div className="form-grid">
                        <label>
                            Producto
                            <select
                                required
                                value={biologicalForm.data.part_id}
                                onChange={(event) => {
                                    biologicalForm.setData(
                                        'part_id',
                                        event.target.value,
                                    );
                                    biologicalForm.setData('operation_id', '');
                                }}
                            >
                                <option value="">Seleccionar</option>
                                {Array.from(
                                    new Map(
                                        operations.map((operation) => [
                                            String(operation.part_id),
                                            operation,
                                        ]),
                                    ).values(),
                                ).map((operation) => (
                                    <option
                                        key={String(operation.part_id)}
                                        value={String(operation.part_id)}
                                    >
                                        {text(operation.part_code)} ·{' '}
                                        {text(operation.part_name)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Etapa de la ruta
                            <select
                                required
                                value={biologicalForm.data.operation_id}
                                onChange={(event) =>
                                    biologicalForm.setData(
                                        'operation_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccionar</option>
                                {routeOperations.map((operation) => (
                                    <option
                                        key={String(operation.operation_id)}
                                        value={String(operation.operation_id)}
                                    >
                                        {text(operation.operation_code)} ·{' '}
                                        {text(operation.operation_name)} ·{' '}
                                        {text(operation.scheduling_mode)}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Edad mínima (h)
                            <input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                value={biologicalForm.data.minimum_age_hours}
                                onChange={(event) =>
                                    biologicalForm.setData(
                                        'minimum_age_hours',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Edad objetivo (h)
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={biologicalForm.data.target_age_hours}
                                onChange={(event) =>
                                    biologicalForm.setData(
                                        'target_age_hours',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Edad máxima (h)
                            <input
                                required
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={biologicalForm.data.maximum_age_hours}
                                onChange={(event) =>
                                    biologicalForm.setData(
                                        'maximum_age_hours',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <label>
                        Justificación técnica
                        <textarea
                            required
                            value={biologicalForm.data.rationale}
                            onChange={(event) =>
                                biologicalForm.setData(
                                    'rationale',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    {errorMessage(biologicalForm.errors)}
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={biologicalForm.processing}
                        >
                            Aprobar ventana
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={supplyOpen}
                onOpenChange={setSupplyOpen}
                title="Disponibilidad futura"
                description="Registra una llegada prevista. Solo el estado Confirmado permite que la planeación comprometa ese material."
            >
                <form className="mes-form" onSubmit={submitSupply}>
                    <div className="form-grid">
                        <label>
                            Material
                            <select
                                required
                                value={supplyForm.data.part_id}
                                onChange={(event) =>
                                    supplyForm.setData(
                                        'part_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">Seleccionar</option>
                                {parts.map((part) => (
                                    <option
                                        key={String(part.id)}
                                        value={String(part.id)}
                                    >
                                        {text(part.code)} ·{' '}
                                        {text(part.description)} ·{' '}
                                        {text(part.unit)}
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
                                value={supplyForm.data.quantity}
                                onChange={(event) =>
                                    supplyForm.setData(
                                        'quantity',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Disponible desde
                            <input
                                required
                                type="datetime-local"
                                value={supplyForm.data.available_at}
                                onChange={(event) =>
                                    supplyForm.setData(
                                        'available_at',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Estado
                            <select
                                value={supplyForm.data.status}
                                onChange={(event) =>
                                    supplyForm.setData(
                                        'status',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="PLANNED">Planeado</option>
                                <option value="CONFIRMED">Confirmado</option>
                            </select>
                        </label>
                        <label>
                            Origen
                            <input
                                required
                                value={supplyForm.data.source}
                                onChange={(event) =>
                                    supplyForm.setData(
                                        'source',
                                        event.target.value,
                                    )
                                }
                                placeholder="Proveedor u orden de compra"
                            />
                        </label>
                        <label>
                            Referencia
                            <input
                                value={supplyForm.data.reference}
                                onChange={(event) =>
                                    supplyForm.setData(
                                        'reference',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                        <label>
                            Notas
                            <input
                                value={supplyForm.data.notes}
                                onChange={(event) =>
                                    supplyForm.setData(
                                        'notes',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    {errorMessage(supplyForm.errors)}
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={supplyForm.processing}
                        >
                            Registrar disponibilidad
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}
