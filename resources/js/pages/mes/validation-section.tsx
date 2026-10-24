import { type FormEvent, type ReactNode, useState } from 'react';
import { useForm, usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    ClipboardCheck,
    FileKey,
    KeyRound,
    ListChecks,
    Play,
    Plus,
    ShieldCheck,
} from 'lucide-react';
import { MesRecordDialog } from '@/components/mes-record-dialog';

type Item = Record<string, unknown>;
type Dialog =
    | 'protocol'
    | 'protocol-approval'
    | 'run'
    | 'step'
    | 'complete'
    | 'run-approval'
    | null;

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
        DRAFT: 'BORRADOR',
        APPROVED: 'APROBADO',
        IN_PROGRESS: 'EN EJECUCIÓN',
        AWAITING_APPROVAL: 'POR APROBAR',
        PASSED: 'APROBADA',
        FAILED: 'FALLIDA',
        PENDING: 'PENDIENTE',
        PASS: 'CONFORME',
        FAIL: 'NO CONFORME',
        NA: 'NO APLICA',
        EXECUTED: 'EJECUTÓ',
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
    icon: typeof BadgeCheck;
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

export function ValidationSection({
    data,
}: {
    data: {
        validationProtocols?: Item[];
        validationRuns?: Item[];
        validationSteps?: Item[];
        electronicSignatures?: Item[];
        approvedValidationProtocols?: Item[];
        validationOrders?: Item[];
        validationSummary?: Item;
    };
}) {
    const permissions = usePage().props.auth.user?.permissions ?? [];
    const canWrite = permissions.includes('validation.write');
    const canApprove = permissions.includes('validation.approve');
    const protocols = data.validationProtocols ?? [];
    const runs = data.validationRuns ?? [];
    const steps = data.validationSteps ?? [];
    const signatures = data.electronicSignatures ?? [];
    const approvedProtocols = data.approvedValidationProtocols ?? [];
    const orders = data.validationOrders ?? [];
    const summary = data.validationSummary ?? {};
    const [dialog, setDialog] = useState<Dialog>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    const protocolForm = useForm({
        code: '',
        title: '',
        version: '1.0',
        scope: 'Piloto BSF',
        objective: '',
        acceptance_criteria: '',
        steps_text: '',
    });
    const protocolApprovalForm = useForm({ current_password: '', reason: '' });
    const runForm = useForm({
        validation_protocol_id: '',
        production_order_id: '',
    });
    const stepForm = useForm({
        status: 'PASS',
        actual_result: '',
        evidence_reference: '',
    });
    const completeForm = useForm({
        result_summary: '',
        evidence_reference: '',
        current_password: '',
        reason: '',
    });
    const runApprovalForm = useForm({ current_password: '', reason: '' });

    const close = (reset?: () => void) => {
        reset?.();
        setDialog(null);
        setSelectedId(null);
    };
    const open = (next: Exclude<Dialog, null>, id?: number) => {
        setSelectedId(id ?? null);
        setDialog(next);
    };
    const submitProtocol = (event: FormEvent) => {
        event.preventDefault();
        protocolForm.post('/mes/validation/protocols', {
            preserveScroll: true,
            onSuccess: () => close(() => protocolForm.reset()),
        });
    };
    const approveProtocol = (event: FormEvent) => {
        event.preventDefault();
        if (!selectedId) return;
        protocolApprovalForm.patch(
            `/mes/validation/protocols/${selectedId}/approve`,
            {
                preserveScroll: true,
                onSuccess: () => close(() => protocolApprovalForm.reset()),
            },
        );
    };
    const startRun = (event: FormEvent) => {
        event.preventDefault();
        runForm.post('/mes/validation/runs', {
            preserveScroll: true,
            onSuccess: () => close(() => runForm.reset()),
        });
    };
    const recordStep = (event: FormEvent) => {
        event.preventDefault();
        if (!selectedId) return;
        stepForm.patch(`/mes/validation/steps/${selectedId}`, {
            preserveScroll: true,
            onSuccess: () => close(() => stepForm.reset()),
        });
    };
    const completeRun = (event: FormEvent) => {
        event.preventDefault();
        if (!selectedId) return;
        completeForm.patch(`/mes/validation/runs/${selectedId}/complete`, {
            preserveScroll: true,
            onSuccess: () => close(() => completeForm.reset()),
        });
    };
    const approveRun = (event: FormEvent) => {
        event.preventDefault();
        if (!selectedId) return;
        runApprovalForm.patch(`/mes/validation/runs/${selectedId}/approve`, {
            preserveScroll: true,
            onSuccess: () => close(() => runApprovalForm.reset()),
        });
    };

    return (
        <div className="stack-xl">
            <div className="info-callout">
                <ShieldCheck />
                <div>
                    <b>Validación separada de la aprobación</b>
                    <p>
                        El ejecutor registra evidencia y firma con su
                        contraseña. Otra persona con facultad de aprobación debe
                        revisar y firmar. La huella SHA-256 permite detectar
                        alteraciones.
                    </p>
                </div>
            </div>

            <div className="phase-metrics">
                <Metric
                    icon={ClipboardCheck}
                    label="Protocolos aprobados"
                    metric={value(summary.approvedProtocols, '0')}
                    detail="Versiones disponibles para ejecutar"
                />
                <Metric
                    icon={Play}
                    label="En ejecución"
                    metric={value(summary.activeRuns, '0')}
                    detail="Pruebas con captura abierta"
                />
                <Metric
                    icon={KeyRound}
                    label="Por aprobar"
                    metric={value(summary.pendingApproval, '0')}
                    detail="Esperan segunda firma"
                />
                <Metric
                    icon={BadgeCheck}
                    label="Validadas"
                    metric={value(summary.passedRuns, '0')}
                    detail="Evidencia y firmas completas"
                />
            </div>

            {canWrite && (
                <div className="record-actions">
                    <button
                        className="secondary-button"
                        onClick={() => open('protocol')}
                        type="button"
                    >
                        <Plus /> Nuevo protocolo
                    </button>
                    <button
                        className="primary-button"
                        onClick={() => open('run')}
                        type="button"
                    >
                        <Play /> Iniciar validación
                    </button>
                </div>
            )}

            <Card title="Protocolos controlados">
                <Table
                    headers={[
                        'Código / versión',
                        'Título y alcance',
                        'Pasos',
                        'Estado',
                        'Aprobó',
                        'Acción',
                    ]}
                    rows={protocols.map((protocol) => [
                        <div>
                            <b>{value(protocol.code)}</b>
                            <small>v{value(protocol.version)}</small>
                        </div>,
                        <div>
                            <b>{value(protocol.title)}</b>
                            <small>{value(protocol.scope)}</small>
                        </div>,
                        value(protocol.step_count, '0'),
                        <Status>{protocol.status}</Status>,
                        <div>
                            {value(protocol.approved_by_name)}
                            <small>{date(protocol.approved_at)}</small>
                        </div>,
                        canApprove && protocol.status === 'DRAFT' ? (
                            <button
                                className="table-action"
                                onClick={() =>
                                    open(
                                        'protocol-approval',
                                        Number(protocol.id),
                                    )
                                }
                                type="button"
                            >
                                Firmar aprobación
                            </button>
                        ) : (
                            '—'
                        ),
                    ])}
                />
            </Card>

            <Card title="Ejecuciones de validación">
                <Table
                    headers={[
                        'Ejecución',
                        'Protocolo',
                        'Orden',
                        'Progreso',
                        'Estado',
                        'Acción',
                    ]}
                    rows={runs.map((run) => [
                        <div>
                            <b>{value(run.number)}</b>
                            <small>{date(run.started_at)}</small>
                        </div>,
                        <div>
                            {value(run.protocol_code)} · v
                            {value(run.protocol_version)}
                            <small>{value(run.protocol_title)}</small>
                        </div>,
                        value(run.production_order),
                        `${value(run.passed_steps, '0')}/${value(run.step_count, '0')} conformes`,
                        <Status>{run.status}</Status>,
                        <div className="table-actions">
                            {canWrite && run.status === 'IN_PROGRESS' && (
                                <button
                                    className="table-action"
                                    onClick={() =>
                                        open('complete', Number(run.id))
                                    }
                                    type="button"
                                >
                                    Completar
                                </button>
                            )}
                            {canApprove &&
                                run.status === 'AWAITING_APPROVAL' && (
                                    <button
                                        className="table-action"
                                        onClick={() =>
                                            open('run-approval', Number(run.id))
                                        }
                                        type="button"
                                    >
                                        Aprobar
                                    </button>
                                )}
                        </div>,
                    ])}
                />
            </Card>

            <Card title="Resultados por paso">
                <Table
                    headers={[
                        'Ejecución / paso',
                        'Requisito',
                        'Resultado observado',
                        'Evidencia',
                        'Estado',
                        'Acción',
                    ]}
                    rows={steps.map((step) => [
                        <div>
                            <b>{value(step.run_number)}</b>
                            <small>Paso {value(step.sequence)}</small>
                        </div>,
                        <div>
                            {value(step.requirement)}
                            <small>
                                Esperado: {value(step.expected_result)}
                            </small>
                        </div>,
                        value(step.actual_result),
                        value(step.evidence_reference),
                        <Status>{step.status}</Status>,
                        canWrite && step.run_status === 'IN_PROGRESS' ? (
                            <button
                                className="table-action"
                                onClick={() => open('step', Number(step.id))}
                                type="button"
                            >
                                Registrar
                            </button>
                        ) : (
                            '—'
                        ),
                    ])}
                />
            </Card>

            <Card title="Libro de firmas electrónicas">
                <Table
                    headers={[
                        'Fecha',
                        'Firmante',
                        'Rol',
                        'Significado',
                        'Registro',
                        'Huella SHA-256',
                    ]}
                    rows={signatures.map((signature) => [
                        date(signature.signed_at),
                        value(signature.signer_name),
                        value(signature.role_at_signing),
                        <Status>{signature.meaning}</Status>,
                        `${value(signature.signable_type)} #${value(signature.signable_id)}`,
                        <span title={value(signature.digest_sha256)}>
                            {value(signature.digest_sha256).slice(0, 16)}…
                        </span>,
                    ])}
                />
            </Card>

            <MesRecordDialog
                open={dialog === 'protocol'}
                onOpenChange={(isOpen) => !isOpen && close()}
                title="Crear protocolo de validación"
                description="Versiona el objetivo, criterio y pasos antes de solicitar aprobación."
            >
                <form className="mes-form" onSubmit={submitProtocol}>
                    <div className="form-grid">
                        <label>
                            Código
                            <input
                                required
                                value={protocolForm.data.code}
                                onChange={(event) =>
                                    protocolForm.setData(
                                        'code',
                                        event.target.value.toUpperCase(),
                                    )
                                }
                                placeholder="VAL-PILOTO-BSF"
                            />
                        </label>
                        <label>
                            Versión
                            <input
                                required
                                value={protocolForm.data.version}
                                onChange={(event) =>
                                    protocolForm.setData(
                                        'version',
                                        event.target.value,
                                    )
                                }
                            />
                        </label>
                    </div>
                    <label>
                        Título
                        <input
                            required
                            value={protocolForm.data.title}
                            onChange={(event) =>
                                protocolForm.setData(
                                    'title',
                                    event.target.value,
                                )
                            }
                            placeholder="Validación integral del lote piloto"
                        />
                    </label>
                    <label>
                        Alcance
                        <input
                            required
                            value={protocolForm.data.scope}
                            onChange={(event) =>
                                protocolForm.setData(
                                    'scope',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Objetivo
                        <textarea
                            required
                            value={protocolForm.data.objective}
                            onChange={(event) =>
                                protocolForm.setData(
                                    'objective',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Criterio global de aceptación
                        <textarea
                            required
                            value={protocolForm.data.acceptance_criteria}
                            onChange={(event) =>
                                protocolForm.setData(
                                    'acceptance_criteria',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Pasos verificables
                        <textarea
                            required
                            rows={7}
                            value={protocolForm.data.steps_text}
                            onChange={(event) =>
                                protocolForm.setData(
                                    'steps_text',
                                    event.target.value,
                                )
                            }
                            placeholder={
                                'Un paso por línea: requisito | resultado esperado\nEjecutar trazabilidad inversa | Origen localizado en menos de 2 minutos'
                            }
                        />
                    </label>
                    <ErrorMessage errors={protocolForm.errors} />
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={protocolForm.processing}
                        >
                            <Plus /> Crear protocolo
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'protocol-approval'}
                onOpenChange={(isOpen) => !isOpen && close()}
                title="Aprobar protocolo"
                description="La persona que lo creó no puede firmar su aprobación."
            >
                <form className="mes-form" onSubmit={approveProtocol}>
                    <label>
                        Razón de aprobación
                        <textarea
                            required
                            value={protocolApprovalForm.data.reason}
                            onChange={(event) =>
                                protocolApprovalForm.setData(
                                    'reason',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Contraseña actual
                        <input
                            required
                            type="password"
                            autoComplete="current-password"
                            value={protocolApprovalForm.data.current_password}
                            onChange={(event) =>
                                protocolApprovalForm.setData(
                                    'current_password',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <ErrorMessage errors={protocolApprovalForm.errors} />
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={protocolApprovalForm.processing}
                        >
                            <FileKey /> Firmar aprobación
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'run'}
                onOpenChange={(isOpen) => !isOpen && close()}
                title="Iniciar ejecución de validación"
                description="Crea una copia controlada de los pasos del protocolo aprobado."
            >
                <form className="mes-form" onSubmit={startRun}>
                    <label>
                        Protocolo aprobado
                        <select
                            required
                            value={runForm.data.validation_protocol_id}
                            onChange={(event) =>
                                runForm.setData(
                                    'validation_protocol_id',
                                    event.target.value,
                                )
                            }
                        >
                            <option value="">Selecciona…</option>
                            {approvedProtocols.map((protocol) => (
                                <option
                                    key={value(protocol.id)}
                                    value={value(protocol.id)}
                                >
                                    {value(protocol.code)} · v
                                    {value(protocol.version)} ·{' '}
                                    {value(protocol.title)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        Orden o lote relacionado (opcional)
                        <select
                            value={runForm.data.production_order_id}
                            onChange={(event) =>
                                runForm.setData(
                                    'production_order_id',
                                    event.target.value,
                                )
                            }
                        >
                            <option value="">Validación transversal</option>
                            {orders.map((order) => (
                                <option
                                    key={value(order.id)}
                                    value={value(order.id)}
                                >
                                    {value(order.number)} ·{' '}
                                    {value(order.status)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <ErrorMessage errors={runForm.errors} />
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={runForm.processing}
                        >
                            <Play /> Iniciar
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'step'}
                onOpenChange={(isOpen) => !isOpen && close()}
                title="Registrar resultado del paso"
                description="Describe lo observado y referencia la evidencia conservada."
            >
                <form className="mes-form" onSubmit={recordStep}>
                    <label>
                        Resultado
                        <select
                            value={stepForm.data.status}
                            onChange={(event) =>
                                stepForm.setData('status', event.target.value)
                            }
                        >
                            <option value="PASS">Conforme</option>
                            <option value="FAIL">No conforme</option>
                            <option value="NA">No aplica</option>
                        </select>
                    </label>
                    <label>
                        Resultado observado
                        <textarea
                            required
                            value={stepForm.data.actual_result}
                            onChange={(event) =>
                                stepForm.setData(
                                    'actual_result',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Referencia de evidencia
                        <input
                            required
                            value={stepForm.data.evidence_reference}
                            onChange={(event) =>
                                stepForm.setData(
                                    'evidence_reference',
                                    event.target.value,
                                )
                            }
                            placeholder="Folio, ruta o identificador estable"
                        />
                    </label>
                    <ErrorMessage errors={stepForm.errors} />
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={stepForm.processing}
                        >
                            <ListChecks /> Guardar resultado
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'complete'}
                onOpenChange={(isOpen) => !isOpen && close()}
                title="Completar y firmar ejecución"
                description="Todos los pasos deben estar resueltos. Una falla cerrará la ejecución como fallida."
            >
                <form className="mes-form" onSubmit={completeRun}>
                    <label>
                        Resumen del resultado
                        <textarea
                            required
                            value={completeForm.data.result_summary}
                            onChange={(event) =>
                                completeForm.setData(
                                    'result_summary',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Expediente o evidencia consolidada
                        <input
                            required
                            value={completeForm.data.evidence_reference}
                            onChange={(event) =>
                                completeForm.setData(
                                    'evidence_reference',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Significado / razón de firma
                        <textarea
                            required
                            value={completeForm.data.reason}
                            onChange={(event) =>
                                completeForm.setData(
                                    'reason',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Contraseña actual
                        <input
                            required
                            type="password"
                            autoComplete="current-password"
                            value={completeForm.data.current_password}
                            onChange={(event) =>
                                completeForm.setData(
                                    'current_password',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <ErrorMessage errors={completeForm.errors} />
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={completeForm.processing}
                        >
                            <FileKey /> Firmar ejecución
                        </button>
                    </div>
                </form>
            </MesRecordDialog>

            <MesRecordDialog
                open={dialog === 'run-approval'}
                onOpenChange={(isOpen) => !isOpen && close()}
                title="Aprobar validación"
                description="La firma debe pertenecer a una persona distinta del ejecutor."
            >
                <form className="mes-form" onSubmit={approveRun}>
                    <label>
                        Dictamen de aprobación
                        <textarea
                            required
                            value={runApprovalForm.data.reason}
                            onChange={(event) =>
                                runApprovalForm.setData(
                                    'reason',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <label>
                        Contraseña actual
                        <input
                            required
                            type="password"
                            autoComplete="current-password"
                            value={runApprovalForm.data.current_password}
                            onChange={(event) =>
                                runApprovalForm.setData(
                                    'current_password',
                                    event.target.value,
                                )
                            }
                        />
                    </label>
                    <ErrorMessage errors={runApprovalForm.errors} />
                    <div className="form-actions">
                        <button
                            className="primary-button"
                            disabled={runApprovalForm.processing}
                        >
                            <BadgeCheck /> Firmar aprobación
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}
