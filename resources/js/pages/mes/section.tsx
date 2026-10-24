import { FormEvent, useMemo, useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowRight,
    BookOpenCheck,
    Box,
    Boxes,
    CircleCheck,
    Factory,
    FileSignature,
    FlaskConical,
    GitBranch,
    MapPin,
    PackagePlus,
    ScanLine,
    Search,
    Settings2,
    Sprout,
    Users,
    CalendarClock,
    Cable,
    ClipboardCheck,
    DatabaseBackup,
    Scale,
    ScrollText,
    ShieldAlert,
    Thermometer,
    Utensils,
    Wrench,
    Gauge,
    Pause,
    Play,
    RotateCcw,
    Timer,
    TriangleAlert,
    Truck,
} from 'lucide-react';
import { MesRecordDialog } from '@/components/mes-record-dialog';
import {
    AuditSection,
    BiosecuritySection,
    ContinuitySection,
    EnvironmentSection,
    GovernanceSection,
    MassBalanceSection,
    OrdersSection,
    QualitySection,
    TraceSection,
} from '@/pages/mes/p0-sections';
import {
    AdvancedQualitySection,
    FeedingSection,
    MaintenanceSection,
} from '@/pages/mes/p1-sections';
import {
    MaintenanceSparesSection,
    PerformanceSection,
    QualityReleaseSection,
} from '@/pages/mes/industrial-sections';
import {
    LaboratorySection,
    MaintenanceConditionSection,
} from '@/pages/mes/advanced-sections';
import {
    UserAdministration,
    type AccessPermission,
    type AccessRole,
    type UserAccount,
} from '@/pages/mes/user-administration';
import { LogisticsSection } from '@/pages/mes/logistics-section';
import { ActualCostsSection } from '@/pages/mes/actual-costs-section';
import { ValidationSection } from '@/pages/mes/validation-section';
import { IntegrationSection } from '@/pages/mes/integration-section';

type Part = {
    id: number;
    code: string;
    description: string;
    unit: string;
    type: string;
    serial_prefix: string;
    active: boolean;
};
type Location = {
    id: number;
    code: string;
    description: string;
    type: string;
    active: boolean;
};
type WorkCenter = {
    id: number;
    code: string;
    description: string;
    status: string;
};
type Operation = {
    id: number;
    code: string;
    name: string;
    area: string;
    duration_hours: number | null;
    work_center: WorkCenter;
    input_part: Part | null;
    output_part: Part;
};
type Container = {
    id: number;
    serial: string;
    status: string;
    origin: string;
    supplier_lot?: string;
    production_lot?: string;
    quantity_current: number;
    unit: string;
    active: boolean;
    part: Part;
    location: Location | null;
};
type Batch = {
    id: number;
    rack: string;
    level: number;
    tray_color: string;
    status: string;
    level_at: string;
    recipe: Record<string, number>;
    container: Container;
};
type Parameter = {
    id: number;
    code: string;
    description: string;
    value: number;
    unit: string;
    scope: string;
    source: string;
    editable: boolean;
};
type Row = Record<string, string | number | boolean | null>;
type SectionData = {
    parts?: Part[];
    locations?: Location[];
    operations?: Operation[];
    containers?: Container[];
    batches?: Batch[];
    parameters?: Parameter[];
    routes?: Row[];
    bom?: Row[];
    events?: Row[];
    orders?: Row[];
    orderOperations?: Row[];
    executionSessions?: Row[];
    checklistItems?: Row[];
    scrapReasons?: Row[];
    recentScrap?: Row[];
    shopFloorSummary?: Record<string, string | number>;
    qualitySpecifications?: Row[];
    qualityInspections?: Row[];
    environmentalLimits?: Row[];
    environmentalReadings?: Row[];
    biosecurityEvents?: Row[];
    feedingEvents?: Row[];
    targetContainers?: Row[];
    substrateContainers?: Row[];
    qualityDeviations?: Row[];
    correctiveActions?: Row[];
    assets?: Row[];
    workOrders?: Row[];
    workCenters?: Row[];
    shifts?: Row[];
    downtimeReasons?: Row[];
    downtimeEvents?: Row[];
    oeeSnapshots?: Row[];
    oeeSummary?: Record<string, string | number>;
    certificates?: Row[];
    retentionSamples?: Row[];
    spareParts?: Row[];
    spareUsages?: Row[];
    laboratoryMethods?: Row[];
    laboratorySamples?: Row[];
    laboratoryResults?: Row[];
    conditionReadings?: Row[];
    maintenanceKpis?: Record<string, unknown>;
    auditEvents?: Row[];
    backupRuns?: Row[];
    documents?: Row[];
    database?: string;
    schedule?: string;
    retention?: string;
    users?: UserAccount[];
    roles?: AccessRole[];
    permissions?: AccessPermission[];
    logisticsSummary?: Record<string, string | number>;
    customers?: Row[];
    finishedParts?: Row[];
    salesOrders?: Row[];
    allocations?: Row[];
    shipments?: Row[];
    shipmentItems?: Row[];
    customerReturns?: Row[];
    recalls?: Row[];
    costOrders?: Row[];
    costEntries?: Row[];
    costRates?: Row[];
    costParts?: Row[];
    costWorkCenters?: Row[];
    actualCostSummary?: Row;
    validationProtocols?: Row[];
    validationRuns?: Row[];
    validationSteps?: Row[];
    electronicSignatures?: Row[];
    approvedValidationProtocols?: Row[];
    validationOrders?: Row[];
    validationSummary?: Row;
    integrationEndpoints?: Row[];
    integrationMessages?: Row[];
    integrationAttempts?: Row[];
    integrationReconciliations?: Row[];
    activeIntegrationEndpoints?: Row[];
    integrationSummary?: Row;
    costs?: Array<{
        operation: string;
        material: number;
        labor: number;
        overhead: number;
        total: number;
        accumulated: number;
    }>;
    summary?: {
        material: number;
        labor: number;
        overhead: number;
        total: number;
    };
};

const meta: Record<
    string,
    { title: string; kicker: string; description: string; icon: typeof Boxes }
> = {
    parts: {
        title: 'Parts / Números de parte',
        kicker: 'DATOS MAESTROS',
        description:
            'Productos, materiales, WIP y coproductos utilizados por el proceso.',
        icon: Boxes,
    },
    locations: {
        title: 'Locations / Ubicaciones',
        kicker: 'DATOS MAESTROS',
        description:
            'Almacenes, workcenters y posiciones físicas de guardería.',
        icon: MapPin,
    },
    operations: {
        title: 'Operations / Operaciones',
        kicker: 'DATOS MAESTROS',
        description: 'Transformaciones que componen el ciclo BSF.',
        icon: Factory,
    },
    routing: {
        title: 'Process Routing',
        kicker: 'INGENIERÍA',
        description: 'Secuencia de reproducción, bioconversión y postproceso.',
        icon: ArrowRight,
    },
    bom: {
        title: 'Bill of Materials / BOM',
        kicker: 'INGENIERÍA',
        description: 'Consumos estándar de alimento, agua y salvado.',
        icon: GitBranch,
    },
    orders: {
        title: 'Órdenes de producción',
        kicker: 'PLANIFICAR',
        description:
            'Prioridades, calendario, ruta e insumos requeridos por orden.',
        icon: CalendarClock,
    },
    control: {
        title: 'Control Panel',
        kicker: 'PRODUCCIÓN',
        description: 'Carga de fuente, operación y reporte de producción.',
        icon: Factory,
    },
    nursery: {
        title: 'Guardería',
        kicker: 'WC-NUR',
        description: 'Seguimiento visual de los lotes N0–N5.',
        icon: Sprout,
    },
    feeding: {
        title: 'Alimentación de larveros',
        kicker: 'FASE 1 · EJECUTAR',
        description:
            'Dosificación trazable de sustrato con captura por serial y descuento de inventario.',
        icon: Utensils,
    },
    inventory: {
        title: 'Inventory / Contenedores',
        kicker: 'INVENTARIO',
        description: 'Existencias serializadas, saldo, estado y ubicación.',
        icon: Box,
    },
    logistics: {
        title: 'Logística y embarques',
        kicker: 'ENTREGAR · TRAZABILIDAD COMERCIAL',
        description:
            'Pedidos, reserva FEFO, surtido, embarque, devoluciones y retiro por cliente.',
        icon: Truck,
    },
    trace: {
        title: 'Genealogía / Trazabilidad',
        kicker: 'INVENTARIO',
        description: 'Relación de contenedores de entrada y salida.',
        icon: GitBranch,
    },
    quality: {
        title: 'Calidad y liberación',
        kicker: 'CONTROLAR',
        description:
            'Especificaciones, muestreo, cuarentena y disposición de lotes.',
        icon: ClipboardCheck,
    },
    environment: {
        title: 'Monitoreo ambiental',
        kicker: 'CONTROLAR',
        description: 'Series de temperatura y humedad con límites y alarmas.',
        icon: Thermometer,
    },
    biosecurity: {
        title: 'Bioseguridad',
        kicker: 'CONTROLAR',
        description:
            'Limpieza, plagas, visitas, mortalidad y acciones sanitarias.',
        icon: ShieldAlert,
    },
    'mass-balance': {
        title: 'Balance de masa',
        kicker: 'CONTROLAR',
        description:
            'Entradas, biomasa, frass, coproductos, evaporación y pérdidas.',
        icon: Scale,
    },
    performance: {
        title: 'OEE, turnos y paros',
        kicker: 'CIERRE INDUSTRIAL · CONTROLAR',
        description:
            'Disponibilidad, rendimiento, calidad y causas de pérdida por centro y turno.',
        icon: Gauge,
    },
    maintenance: {
        title: 'Mantenimiento y calibración',
        kicker: 'FASE 1 · INGENIERÍA',
        description:
            'Activos, órdenes preventivas y correctivas, calibración, bloqueo y tiempo de paro.',
        icon: Wrench,
    },
    audit: {
        title: 'Auditoría',
        kicker: 'GOBERNAR',
        description: 'Bitácora inmutable de cambios, decisiones y razones.',
        icon: ScrollText,
    },
    continuity: {
        title: 'Continuidad operativa',
        kicker: 'GOBERNAR',
        description: 'Respaldos SQLite verificados, retención y recuperación.',
        icon: DatabaseBackup,
    },
    governance: {
        title: 'Fase 0 y gobierno',
        kicker: 'GOBERNAR',
        description:
            'Alcance, URS, riesgos, métodos, regulación y definición de lote.',
        icon: BookOpenCheck,
    },
    validation: {
        title: 'Validación y firmas',
        kicker: 'GOBERNAR · EVIDENCIA CONTROLADA',
        description:
            'Protocolos versionados, ejecución con evidencia y doble firma electrónica independiente.',
        icon: FileSignature,
    },
    integrations: {
        title: 'Centro de integraciones',
        kicker: 'PLANTA CONECTADA · INTEROPERABILIDAD',
        description:
            'Mensajes idempotentes, reintentos controlados, cuarentena, evidencia de entrega y conciliación.',
        icon: Cable,
    },
    parameters: {
        title: 'Parámetros',
        kicker: 'CONFIGURACIÓN',
        description: 'Drivers operativos y de costo con fuente conocida.',
        icon: Settings2,
    },
    costs: {
        title: 'Costeo real por lote',
        kicker: 'ERP Y ESCALAMIENTO · COSTOS',
        description:
            'Materiales, mano de obra, energía, indirectos y coproductos conciliados por orden.',
        icon: FlaskConical,
    },
    users: {
        title: 'Usuarios y accesos',
        kicker: 'SEGURIDAD',
        description: 'Roles por área y permisos efectivos de cada cuenta.',
        icon: Users,
    },
};

function PageIntro({ section }: { section: string }) {
    const item = meta[section];
    const Icon = item.icon;
    return (
        <div className="page-intro">
            <div>
                <p className="eyebrow">{item.kicker}</p>
                <h1>{item.title}</h1>
                <p>{item.description}</p>
            </div>
            <div className="intro-icon">
                <Icon />
            </div>
        </div>
    );
}

function MasterTable({
    section,
    data,
}: {
    section: string;
    data: SectionData;
}) {
    if (section === 'parts')
        return (
            <DataCard title="Números de parte">
                <Table
                    headers={[
                        'Código',
                        'Descripción',
                        'Unidad',
                        'Tipo',
                        'Prefijo',
                        'Activo',
                    ]}
                    rows={(data.parts ?? []).map((x) => [
                        x.code,
                        x.description,
                        x.unit,
                        x.type,
                        x.serial_prefix,
                        x.active ? 'Sí' : 'No',
                    ])}
                />
            </DataCard>
        );
    if (section === 'locations')
        return (
            <DataCard title="Ubicaciones">
                <Table
                    headers={['Código', 'Descripción', 'Tipo', 'Activo']}
                    rows={(data.locations ?? []).map((x) => [
                        x.code,
                        x.description,
                        x.type,
                        x.active ? 'Sí' : 'No',
                    ])}
                />
            </DataCard>
        );
    if (section === 'operations')
        return (
            <DataCard title="Operaciones">
                <Table
                    headers={[
                        'Código',
                        'Operación',
                        'Área',
                        'Entrada',
                        'Salida',
                        'Workcenter',
                        'Duración',
                    ]}
                    rows={(data.operations ?? []).map((x) => [
                        x.code,
                        x.name,
                        x.area,
                        x.input_part?.code ?? '—',
                        x.output_part.code,
                        x.work_center?.code ?? '—',
                        x.duration_hours === null
                            ? 'Por definir'
                            : `${x.duration_hours} h`,
                    ])}
                />
            </DataCard>
        );
    if (section === 'routing')
        return (
            <DataCard title="Ruta BSF">
                <div className="route-flow">
                    {(data.routes ?? []).map((row) => (
                        <article key={String(row.id)}>
                            <span>
                                {String(row.sequence).padStart(2, '0')} ·{' '}
                                {row.area}
                            </span>
                            <b>{row.name}</b>
                            <small>
                                {row.code} · {row.work_center}
                            </small>
                            <ArrowRight />
                        </article>
                    ))}
                </div>
            </DataCard>
        );
    if (section === 'bom')
        return (
            <DataCard title="Componentes">
                <Table
                    headers={[
                        'Parte padre',
                        'Componente',
                        'Descripción',
                        'Cantidad',
                        'Unidad',
                        'Activo',
                    ]}
                    rows={(data.bom ?? []).map((x) => [
                        x.parent,
                        x.component,
                        x.description,
                        Number(x.quantity_per_unit).toLocaleString('es-MX'),
                        x.unit,
                        x.active ? 'Sí' : 'No',
                    ])}
                />
            </DataCard>
        );
    if (section === 'trace')
        return (
            <DataCard title="Eventos de genealogía">
                <Table
                    headers={[
                        'Fecha',
                        'Contenedor padre',
                        'Contenedor hijo',
                        'Operación',
                        'Acción',
                        'Cantidad',
                    ]}
                    rows={(data.events ?? []).map((x) => [
                        dateTime(x.occurred_at),
                        x.parent ?? 'Origen',
                        x.child,
                        x.operation ?? '—',
                        x.action,
                        x.quantity ? `${x.quantity} ${x.unit}` : '—',
                    ])}
                    empty="Todavía no hay transformaciones con genealogía."
                />
            </DataCard>
        );
    return null;
}

function ControlPanel({
    operations = [],
    containers = [],
    orderOperations = [],
    executionSessions = [],
    checklistItems = [],
    scrapReasons = [],
    recentScrap = [],
    shopFloorSummary = {},
}: {
    operations?: Operation[];
    containers?: Container[];
    orderOperations?: Row[];
    executionSessions?: Row[];
    checklistItems?: Row[];
    scrapReasons?: Row[];
    recentScrap?: Row[];
    shopFloorSummary?: Record<string, string | number>;
}) {
    const firstJob =
        orderOperations.find((row) => row.status === 'IN_PROGRESS') ??
        orderOperations.find((row) => row.status === 'READY') ??
        orderOperations[0];
    const [selectedJobId, setSelectedJobId] = useState(
        firstJob ? String(firstJob.id) : '',
    );
    const initialOperation = firstJob?.operation_id
        ? Number(firstJob.operation_id)
        : (operations[0]?.id ?? 0);
    const [selected, setSelected] = useState(initialOperation);
    const [inputScan, setInputScan] = useState('');
    const [pauseOpen, setPauseOpen] = useState(false);
    const [scrapOpen, setScrapOpen] = useState(false);
    const operation =
        operations.find((row) => row.id === selected) ?? operations[0];
    const currentJob = orderOperations.find(
        (row) => String(row.id) === selectedJobId,
    );
    const currentSession = executionSessions.find(
        (row) => String(row.production_order_operation_id) === selectedJobId,
    );
    const currentChecklist = checklistItems.filter(
        (row) => String(row.production_order_operation_id) === selectedJobId,
    );
    const instructionSteps = (() => {
        if (!currentJob?.instruction_steps) return [] as string[];
        try {
            const parsed = JSON.parse(String(currentJob.instruction_steps));
            return Array.isArray(parsed)
                ? parsed.map((item) => String(item))
                : [];
        } catch {
            return [] as string[];
        }
    })();
    const checklistComplete =
        currentChecklist.length > 0 &&
        currentChecklist.every((row) => Boolean(row.completed));
    const compatible = containers.filter(
        (row) =>
            !operation?.input_part || row.part.id === operation.input_part.id,
    );
    const form = useForm({
        operation_id: operation?.id ?? 0,
        input_container_id: '',
        quantity_in: '',
        quantity_out: '',
        notes: '',
        production_order_id: firstJob
            ? String(firstJob.production_order_id)
            : '',
        production_order_operation_id: firstJob ? String(firstJob.id) : '',
    });
    const pause = useForm({ reason: '' });
    const scrap = useForm({
        production_execution_session_id: '',
        scrap_reason_code_id: '',
        container_id: '',
        quantity: '',
        unit: operation?.output_part.unit ?? 'kg',
        notes: '',
    });
    if (!operation) return <Empty text="No hay operaciones configuradas." />;
    const choose = (id: number) => {
        setSelected(id);
        form.setData('operation_id', id);
        form.setData('input_container_id', '');
    };
    const chooseJob = (job: Row | undefined) => {
        if (!job) {
            setSelectedJobId('');
            form.setData('production_order_operation_id', '');
            form.setData('production_order_id', '');
            return;
        }
        setSelectedJobId(String(job.id));
        form.setData('production_order_operation_id', String(job.id));
        form.setData('production_order_id', String(job.production_order_id));
        choose(Number(job.operation_id));
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/mes/production', {
            preserveScroll: true,
            onSuccess: () => form.reset('quantity_in', 'quantity_out', 'notes'),
        });
    };
    const statusClass = (value: unknown) =>
        `status-pill status-${String(value).toLowerCase().replaceAll('_', '-')}`;
    const canProduce =
        !currentJob ||
        (currentSession?.status === 'RUNNING' && checklistComplete);
    return (
        <div className="control-workspace">
            <div className="shop-floor-metrics">
                <article>
                    <Play />
                    <span>Listas para iniciar</span>
                    <strong>{shopFloorSummary.ready ?? 0}</strong>
                </article>
                <article>
                    <Timer />
                    <span>En ejecución</span>
                    <strong>{shopFloorSummary.running ?? 0}</strong>
                </article>
                <article>
                    <Pause />
                    <span>En pausa</span>
                    <strong>{shopFloorSummary.paused ?? 0}</strong>
                </article>
                <article>
                    <CircleCheck />
                    <span>Terminadas hoy</span>
                    <strong>{shopFloorSummary.completedToday ?? 0}</strong>
                </article>
            </div>

            <div className="shop-floor-grid">
                <aside className="dispatch-queue">
                    <header>
                        <div>
                            <p className="eyebrow">DESPACHO</p>
                            <h2>Cola de trabajo</h2>
                        </div>
                        <span>{orderOperations.length}</span>
                    </header>
                    <div className="dispatch-list">
                        {orderOperations.map((job) => (
                            <button
                                type="button"
                                key={String(job.id)}
                                className={
                                    String(job.id) === selectedJobId
                                        ? 'dispatch-job active'
                                        : 'dispatch-job'
                                }
                                onClick={() => chooseJob(job)}
                            >
                                <span className="dispatch-job-topline">
                                    <b>{job.order_number}</b>
                                    <span className={statusClass(job.status)}>
                                        {job.status}
                                    </span>
                                </span>
                                <strong>
                                    {job.operation_code} · {job.operation_name}
                                </strong>
                                <small>
                                    {job.work_center} · {job.part_code} ·{' '}
                                    {job.planned_quantity} {job.unit}
                                </small>
                            </button>
                        ))}
                        {orderOperations.length === 0 && (
                            <div className="empty-state">
                                No hay trabajo liberado para piso.
                            </div>
                        )}
                    </div>
                </aside>

                <div className="execution-console">
                    <section className="execution-context">
                        <div>
                            <p className="eyebrow">AUTORIZACIÓN DE TRABAJO</p>
                            <h2>
                                {currentJob?.order_number ??
                                    'Captura por excepción'}
                            </h2>
                        </div>
                        <label>
                            Operación liberada
                            <select
                                value={form.data.production_order_operation_id}
                                onChange={(event) =>
                                    chooseJob(
                                        orderOperations.find(
                                            (row) =>
                                                String(row.id) ===
                                                event.target.value,
                                        ),
                                    )
                                }
                            >
                                <option value="">
                                    Captura sin orden (supervisión)
                                </option>
                                {orderOperations.map((row) => (
                                    <option
                                        value={String(row.id)}
                                        key={String(row.id)}
                                    >
                                        {row.order_number} ·{' '}
                                        {row.operation_code} · {row.status}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="execution-actions">
                            {currentJob?.status === 'READY' && (
                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() =>
                                        router.post(
                                            `/mes/control/operations/${currentJob.id}/start`,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <Play /> Iniciar
                                </button>
                            )}
                            {currentSession?.status === 'RUNNING' && (
                                <button
                                    type="button"
                                    className="secondary-button"
                                    onClick={() => setPauseOpen(true)}
                                >
                                    <Pause /> Pausar
                                </button>
                            )}
                            {currentSession?.status === 'PAUSED' && (
                                <button
                                    type="button"
                                    className="primary-button"
                                    onClick={() =>
                                        router.patch(
                                            `/mes/control/sessions/${currentSession.id}/resume`,
                                            {},
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    <RotateCcw /> Reanudar
                                </button>
                            )}
                            {currentSession && (
                                <button
                                    type="button"
                                    className="danger-button"
                                    disabled={
                                        currentSession.status !== 'RUNNING'
                                    }
                                    onClick={() => {
                                        scrap.setData(
                                            'production_execution_session_id',
                                            String(currentSession.id),
                                        );
                                        scrap.setData(
                                            'unit',
                                            operation.output_part.unit,
                                        );
                                        setScrapOpen(true);
                                    }}
                                >
                                    <TriangleAlert /> Desperdicio
                                </button>
                            )}
                        </div>
                    </section>

                    <section className="work-instruction-panel">
                        <header>
                            <div>
                                <p className="eyebrow">INSTRUCCIÓN DIGITAL</p>
                                <h2>
                                    {currentJob?.instruction_title ??
                                        'Seleccione trabajo liberado'}
                                </h2>
                            </div>
                            {currentSession && (
                                <span
                                    className={statusClass(
                                        currentSession.status,
                                    )}
                                >
                                    {currentSession.status}
                                </span>
                            )}
                        </header>
                        <div className="instruction-checklist">
                            {(currentChecklist.length > 0
                                ? currentChecklist
                                : instructionSteps.map(
                                      (description, index) =>
                                          ({
                                              id: `preview-${index}`,
                                              description,
                                              completed: false,
                                              preview: true,
                                          }) as unknown as Row,
                                  )
                            ).map((item, index) => (
                                <label key={String(item.id)}>
                                    <input
                                        type="checkbox"
                                        checked={Boolean(item.completed)}
                                        disabled={
                                            !currentSession ||
                                            Boolean(item.preview) ||
                                            currentSession.status === 'PAUSED'
                                        }
                                        onChange={(event) =>
                                            router.patch(
                                                `/mes/control/operations/${currentJob?.id}/checklist/${item.id}`,
                                                {
                                                    completed:
                                                        event.target.checked,
                                                },
                                                { preserveScroll: true },
                                            )
                                        }
                                    />
                                    <span>{index + 1}</span>
                                    <p>{item.description}</p>
                                </label>
                            ))}
                            {!currentJob && (
                                <div className="empty-state">
                                    Seleccione una operación de la cola para ver
                                    su instrucción vigente.
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="process-pills">
                        {operations.map((row) => (
                            <button
                                type="button"
                                key={row.id}
                                className={
                                    row.id === operation.id ? 'active' : ''
                                }
                                onClick={() => choose(row.id)}
                            >
                                {row.name}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={submit} className="process-board">
                        <section className="process-port source">
                            <p className="eyebrow">ENTRADA</p>
                            <ScanLine />
                            <h2>
                                {operation.input_part?.description ??
                                    'Sin material de entrada'}
                            </h2>
                            {operation.input_part && (
                                <>
                                    <label>
                                        Escanear contenedor
                                        <span className="scan-input">
                                            <ScanLine />
                                            <input
                                                placeholder="Escanea o escribe el serial"
                                                value={inputScan}
                                                onChange={(event) => {
                                                    const serial =
                                                        event.target.value;
                                                    setInputScan(serial);
                                                    const match =
                                                        compatible.find(
                                                            (row) =>
                                                                row.serial.toLowerCase() ===
                                                                serial
                                                                    .trim()
                                                                    .toLowerCase(),
                                                        );
                                                    if (match)
                                                        form.setData(
                                                            'input_container_id',
                                                            String(match.id),
                                                        );
                                                }}
                                            />
                                        </span>
                                    </label>
                                    <label>
                                        Contenedor
                                        <select
                                            value={form.data.input_container_id}
                                            onChange={(event) =>
                                                form.setData(
                                                    'input_container_id',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        >
                                            <option value="">
                                                Seleccionar serial
                                            </option>
                                            {compatible.map((row) => (
                                                <option
                                                    key={row.id}
                                                    value={row.id}
                                                >
                                                    {row.serial} ·{' '}
                                                    {row.quantity_current}{' '}
                                                    {row.unit}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label>
                                        Cantidad de entrada
                                        <input
                                            type="number"
                                            min="0.0001"
                                            step="any"
                                            value={form.data.quantity_in}
                                            onChange={(event) =>
                                                form.setData(
                                                    'quantity_in',
                                                    event.target.value,
                                                )
                                            }
                                            required
                                        />
                                    </label>
                                </>
                            )}
                        </section>
                        <section className="station-card">
                            <span>{operation.code}</span>
                            <Factory />
                            <h2>{operation.name}</h2>
                            <p>
                                {operation.work_center?.code} ·{' '}
                                {operation.work_center?.description}
                            </p>
                            <div>
                                <small>Estado de autorización</small>
                                <strong>
                                    {currentJob
                                        ? (currentSession?.status ??
                                          currentJob.status)
                                        : 'EXCEPCIÓN'}
                                </strong>
                            </div>
                            <div>
                                <small>Instrucción</small>
                                <strong>
                                    {checklistComplete
                                        ? 'COMPLETA'
                                        : currentJob
                                          ? 'PENDIENTE'
                                          : 'NO APLICA'}
                                </strong>
                            </div>
                        </section>
                        <section className="process-port output">
                            <p className="eyebrow">PRODUCCIÓN</p>
                            <Box />
                            <h2>{operation.output_part.description}</h2>
                            <label>
                                Cantidad de salida ({operation.output_part.unit}
                                )
                                <input
                                    type="number"
                                    min="0.0001"
                                    step="any"
                                    value={form.data.quantity_out}
                                    onChange={(event) =>
                                        form.setData(
                                            'quantity_out',
                                            event.target.value,
                                        )
                                    }
                                    required
                                />
                            </label>
                            <label>
                                Notas
                                <textarea
                                    value={form.data.notes}
                                    onChange={(event) =>
                                        form.setData(
                                            'notes',
                                            event.target.value,
                                        )
                                    }
                                    rows={3}
                                />
                            </label>
                            <button
                                className="primary-button"
                                disabled={form.processing || !canProduce}
                            >
                                <CircleCheck /> Registrar producción
                            </button>
                            {!canProduce && (
                                <small className="control-gate-message">
                                    Inicie la operación y complete la
                                    instrucción para habilitar el registro.
                                </small>
                            )}
                        </section>
                    </form>
                </div>
            </div>

            <DataCard title="Desperdicio reciente en piso">
                <Table
                    headers={[
                        'Fecha',
                        'Orden',
                        'Operación',
                        'Causa',
                        'Contenedor',
                        'Cantidad',
                        'Operador',
                    ]}
                    rows={recentScrap.map((row) => [
                        dateTime(row.reported_at),
                        row.order_number,
                        row.operation,
                        `${row.reason_code} · ${row.reason}`,
                        row.container ?? 'Sin contenedor',
                        `${row.quantity} ${row.unit}`,
                        row.operator,
                    ])}
                    empty="Sin desperdicio registrado en operaciones activas."
                />
            </DataCard>

            {Object.keys(form.errors).length > 0 && (
                <p className="form-error">
                    {Object.values(form.errors).join(' ')}
                </p>
            )}

            <MesRecordDialog
                open={pauseOpen}
                onOpenChange={setPauseOpen}
                title="Pausar operación"
                description="El motivo queda auditado y el tiempo activo se conserva."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        pause.patch(
                            `/mes/control/sessions/${currentSession?.id}/pause`,
                            {
                                preserveScroll: true,
                                onSuccess: () => {
                                    pause.reset();
                                    setPauseOpen(false);
                                },
                            },
                        );
                    }}
                >
                    <label>
                        Motivo de pausa
                        <textarea
                            value={pause.data.reason}
                            onChange={(event) =>
                                pause.setData('reason', event.target.value)
                            }
                            required
                        />
                    </label>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={pause.processing}
                        >
                            Confirmar pausa
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={scrapOpen}
                onOpenChange={setScrapOpen}
                title="Registrar desperdicio"
                description="Clasifica la pérdida y descuenta inventario cuando se indica un contenedor."
            >
                <form
                    className="mes-form"
                    onSubmit={(event) => {
                        event.preventDefault();
                        scrap.post('/mes/control/scrap', {
                            preserveScroll: true,
                            onSuccess: () => {
                                scrap.reset();
                                setScrapOpen(false);
                            },
                        });
                    }}
                >
                    <div className="form-grid">
                        <label>
                            Causa
                            <select
                                value={scrap.data.scrap_reason_code_id}
                                onChange={(event) =>
                                    scrap.setData(
                                        'scrap_reason_code_id',
                                        event.target.value,
                                    )
                                }
                                required
                            >
                                <option value="">Seleccione…</option>
                                {scrapReasons.map((row) => (
                                    <option
                                        key={String(row.id)}
                                        value={String(row.id)}
                                    >
                                        {row.code} · {row.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Contenedor afectado
                            <select
                                value={scrap.data.container_id}
                                onChange={(event) =>
                                    scrap.setData(
                                        'container_id',
                                        event.target.value,
                                    )
                                }
                            >
                                <option value="">
                                    Sin descuento de inventario
                                </option>
                                {containers.map((row) => (
                                    <option key={row.id} value={row.id}>
                                        {row.serial} · {row.quantity_current}{' '}
                                        {row.unit}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Cantidad
                            <input
                                type="number"
                                min="0.0001"
                                step="any"
                                value={scrap.data.quantity}
                                onChange={(event) =>
                                    scrap.setData(
                                        'quantity',
                                        event.target.value,
                                    )
                                }
                                required
                            />
                        </label>
                        <label>
                            Unidad
                            <input
                                value={scrap.data.unit}
                                onChange={(event) =>
                                    scrap.setData('unit', event.target.value)
                                }
                                required
                            />
                        </label>
                    </div>
                    <label>
                        Observación
                        <textarea
                            value={scrap.data.notes}
                            onChange={(event) =>
                                scrap.setData('notes', event.target.value)
                            }
                            required
                        />
                    </label>
                    <div className="record-actions">
                        <button
                            className="primary-button"
                            disabled={scrap.processing}
                        >
                            Guardar desperdicio
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}

function Nursery({
    batches = [],
    events = [],
}: {
    batches?: Batch[];
    events?: Row[];
}) {
    return (
        <div className="nursery-layout">
            <section className="nursery-rack">
                <header>
                    <div>
                        <p className="eyebrow">RACK-01</p>
                        <h2>Guardería</h2>
                    </div>
                    <span>{batches.length} contenedores</span>
                </header>
                {[0, 1, 2, 3, 4, 5].map((level) => (
                    <div className="rack-level" key={level}>
                        <div className="level-label">
                            <b>N{level}</b>
                            <small>
                                {level === 5 ? 'Transferencia' : '24 h'}
                            </small>
                        </div>
                        <div className="rack-shelf">
                            {batches
                                .filter((x) => x.level === level)
                                .map((batch) => (
                                    <article
                                        className={
                                            batch.tray_color === 'Naranja'
                                                ? 'tray orange'
                                                : 'tray'
                                        }
                                        key={batch.id}
                                    >
                                        <b>
                                            {batch.container.production_lot ??
                                                'Sin lote'}
                                        </b>
                                        <span>{batch.container.serial}</span>
                                        <small>
                                            {batch.container.quantity_current}{' '}
                                            {batch.container.unit}
                                        </small>
                                        {level < 5 && (
                                            <button
                                                onClick={() =>
                                                    router.patch(
                                                        `/mes/nursery/${batch.id}/advance`,
                                                        {},
                                                        {
                                                            preserveScroll: true,
                                                        },
                                                    )
                                                }
                                            >
                                                Mover a N{level + 1}
                                            </button>
                                        )}
                                    </article>
                                ))}
                            {batches.every((x) => x.level !== level) && (
                                <span className="rack-empty">
                                    Sin contenedores
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </section>
            <aside className="mes-card">
                <header>
                    <div>
                        <p className="eyebrow">HISTORIAL</p>
                        <h2>Movimientos</h2>
                    </div>
                    <Sprout />
                </header>
                <div className="timeline">
                    {events.length ? (
                        events.map((event) => (
                            <div key={String(event.id)}>
                                <i />
                                <p>
                                    <b>{event.action}</b>
                                    <span>
                                        {event.serial} ·{' '}
                                        {dateTime(event.occurred_at)}
                                    </span>
                                </p>
                            </div>
                        ))
                    ) : (
                        <Empty text="Sin movimientos nuevos." />
                    )}
                </div>
            </aside>
        </div>
    );
}

function Inventory({
    containers = [],
    parts = [],
    locations = [],
}: {
    containers?: Container[];
    parts?: Part[];
    locations?: Location[];
}) {
    const [showReceive, setShowReceive] = useState(false);
    const [search, setSearch] = useState('');
    const form = useForm({
        part_id: '',
        location_id: '',
        quantity: '',
        containers: '1',
        supplier_lot: '',
    });
    const filtered = useMemo(
        () =>
            containers.filter((row) =>
                `${row.serial} ${row.part.code} ${row.location?.code}`
                    .toLowerCase()
                    .includes(search.toLowerCase()),
            ),
        [containers, search],
    );
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post('/mes/inventory/receive', {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setShowReceive(false);
            },
        });
    };
    return (
        <>
            <MesRecordDialog
                open={showReceive}
                onOpenChange={setShowReceive}
                title="Recibo de material"
                description="Genera los contenedores de entrada y conserva el lote del proveedor para trazabilidad."
            >
                <form className="mes-form" onSubmit={submit}>
                    <div className="form-grid">
                        <label>
                            Parte
                            <select
                                value={form.data.part_id}
                                onChange={(e) =>
                                    form.setData('part_id', e.target.value)
                                }
                                required
                            >
                                <option value="">Seleccionar</option>
                                {parts.map((x) => (
                                    <option value={x.id} key={x.id}>
                                        {x.code} · {x.description}
                                    </option>
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
                                required
                            >
                                <option value="">Seleccionar</option>
                                {locations.map((x) => (
                                    <option value={x.id} key={x.id}>
                                        {x.code}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Lote proveedor
                            <input
                                value={form.data.supplier_lot}
                                onChange={(e) =>
                                    form.setData('supplier_lot', e.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Cantidad por contenedor
                            <input
                                type="number"
                                min="0.0001"
                                step="any"
                                value={form.data.quantity}
                                onChange={(e) =>
                                    form.setData('quantity', e.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Número de contenedores
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={form.data.containers}
                                onChange={(e) =>
                                    form.setData('containers', e.target.value)
                                }
                                required
                            />
                        </label>
                    </div>
                    <div className="form-actions">
                        <button
                            type="button"
                            onClick={() => setShowReceive(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            className="primary-button"
                            disabled={form.processing}
                        >
                            Generar recibo
                        </button>
                    </div>
                    {Object.keys(form.errors).length > 0 && (
                        <p className="form-error">
                            {Object.values(form.errors).join(' ')}
                        </p>
                    )}
                </form>
            </MesRecordDialog>
            <DataCard
                title="Contenedores"
                action={
                    <button
                        className="primary-button"
                        onClick={() => setShowReceive(true)}
                    >
                        <PackagePlus /> Recibir
                    </button>
                }
            >
                <div className="table-toolbar">
                    <label>
                        <Search />
                        <input
                            placeholder="Buscar serial, parte o ubicación"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </label>
                    <span>{filtered.length} registros</span>
                </div>
                <Table
                    headers={[
                        'Serial',
                        'Parte',
                        'Descripción',
                        'Saldo',
                        'Ubicación',
                        'Lote',
                        'Estado',
                    ]}
                    rows={filtered.map((x) => [
                        x.serial,
                        x.part.code,
                        x.part.description,
                        `${Number(x.quantity_current).toLocaleString('es-MX')} ${x.unit}`,
                        x.location?.code ?? '—',
                        x.production_lot ?? x.supplier_lot ?? '—',
                        x.status,
                    ])}
                />
            </DataCard>
        </>
    );
}

function ParameterRow({ parameter }: { parameter: Parameter }) {
    const form = useForm({ value: String(parameter.value) });
    return (
        <tr>
            <td className="code-cell">{parameter.code}</td>
            <td>{parameter.description}</td>
            <td>
                <input
                    className="table-input"
                    type="number"
                    min="0"
                    step="any"
                    value={form.data.value}
                    onChange={(e) => form.setData('value', e.target.value)}
                />
            </td>
            <td>{parameter.unit}</td>
            <td>{parameter.scope}</td>
            <td>{parameter.source}</td>
            <td>
                <button
                    className="small-button"
                    onClick={() =>
                        form.patch(`/mes/parameters/${parameter.id}`, {
                            preserveScroll: true,
                        })
                    }
                    disabled={form.processing}
                >
                    Guardar
                </button>
            </td>
        </tr>
    );
}

function Parameters({ parameters = [] }: { parameters?: Parameter[] }) {
    return (
        <DataCard title="Drivers configurables">
            <div className="table-shell">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Descripción</th>
                            <th>Valor</th>
                            <th>Unidad</th>
                            <th>Alcance</th>
                            <th>Fuente</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {parameters.map((parameter) => (
                            <ParameterRow
                                key={parameter.id}
                                parameter={parameter}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </DataCard>
    );
}

function Costs({ data }: { data: SectionData }) {
    return <ActualCostsSection data={data} />;
}

function DataCard({
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
    empty = 'Sin registros.',
}: {
    headers: string[];
    rows: Array<Array<React.ReactNode>>;
    empty?: string;
}) {
    return (
        <div className="table-shell">
            <table>
                <thead>
                    <tr>
                        {headers.map((x) => (
                            <th key={x}>{x}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, index) => (
                        <tr key={index}>
                            {row.map((cell, cellIndex) => (
                                <td
                                    key={cellIndex}
                                    className={
                                        cellIndex === 0 ? 'code-cell' : ''
                                    }
                                >
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={headers.length}>
                                <Empty text={empty} />
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
function Empty({ text }: { text: string }) {
    return <div className="empty-state">{text}</div>;
}
function dateTime(value: Row[string]) {
    return typeof value === 'string' || typeof value === 'number'
        ? new Date(value).toLocaleString('es-MX')
        : '—';
}

export default function Section({
    section,
    data,
}: {
    section: string;
    data: SectionData;
}) {
    const render = () => {
        if (
            ['parts', 'locations', 'operations', 'routing', 'bom'].includes(
                section,
            )
        )
            return <MasterTable section={section} data={data} />;
        if (section === 'control')
            return (
                <ControlPanel
                    operations={data.operations}
                    containers={data.containers}
                    orderOperations={data.orderOperations}
                    executionSessions={data.executionSessions}
                    checklistItems={data.checklistItems}
                    scrapReasons={data.scrapReasons}
                    recentScrap={data.recentScrap}
                    shopFloorSummary={data.shopFloorSummary}
                />
            );
        if (section === 'users')
            return (
                <UserAdministration
                    users={data.users ?? []}
                    roles={data.roles ?? []}
                    permissions={data.permissions ?? []}
                />
            );
        if (section === 'nursery')
            return <Nursery batches={data.batches} events={data.events} />;
        if (section === 'feeding') return <FeedingSection data={data} />;
        if (section === 'inventory')
            return (
                <Inventory
                    containers={data.containers}
                    parts={data.parts}
                    locations={data.locations}
                />
            );
        if (section === 'logistics') return <LogisticsSection data={data} />;
        if (section === 'orders') return <OrdersSection data={data} />;
        if (section === 'trace') return <TraceSection data={data} />;
        if (section === 'quality')
            return (
                <div className="stack-xl">
                    <QualitySection data={data} />
                    <AdvancedQualitySection data={data} />
                    <QualityReleaseSection data={data} />
                    <LaboratorySection data={data} />
                </div>
            );
        if (section === 'environment')
            return <EnvironmentSection data={data} />;
        if (section === 'biosecurity')
            return <BiosecuritySection data={data} />;
        if (section === 'mass-balance')
            return <MassBalanceSection data={data} />;
        if (section === 'performance')
            return <PerformanceSection data={data} />;
        if (section === 'maintenance')
            return (
                <div className="stack-xl">
                    <MaintenanceSection data={data} />
                    <MaintenanceSparesSection data={data} />
                    <MaintenanceConditionSection data={data} />
                </div>
            );
        if (section === 'audit') return <AuditSection data={data} />;
        if (section === 'continuity') return <ContinuitySection data={data} />;
        if (section === 'governance') return <GovernanceSection data={data} />;
        if (section === 'validation') return <ValidationSection data={data} />;
        if (section === 'integrations')
            return <IntegrationSection data={data} />;
        if (section === 'parameters')
            return <Parameters parameters={data.parameters} />;
        if (section === 'costs') return <Costs data={data} />;
        return <Empty text="Pantalla no disponible." />;
    };
    return (
        <>
            <Head title={meta[section]?.title ?? 'InsectMES'} />
            <div className="mes-page">
                <PageIntro section={section} />
                {render()}
            </div>
        </>
    );
}

Section.layout = {
    breadcrumbs: [
        { title: 'InsectMES', href: '/dashboard' },
        { title: 'Módulo', href: '#' },
    ],
};
