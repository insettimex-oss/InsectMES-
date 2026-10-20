import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Boxes,
    CalendarClock,
    ClipboardCheck,
    Factory,
    PackageOpen,
    ShieldAlert,
} from 'lucide-react';

type Stat = { label: string; value: number; detail: string };
type Run = {
    id: number;
    occurred_at: string;
    operation: string;
    serial: string;
    quantity_out: number;
    unit: string;
    operator: string;
};

export default function Dashboard({
    stats,
    recentRuns,
    inventoryByType,
}: {
    stats: Stat[];
    recentRuns: Run[];
    inventoryByType: Array<{ type: string; total: number }>;
}) {
    const shortcuts = [
        ['/mes/orders', 'Planificar órdenes', CalendarClock],
        ['/mes/control', 'Ejecutar producción', Factory],
        ['/mes/quality', 'Liberar calidad', ClipboardCheck],
        ['/mes/biosecurity', 'Gestionar bioseguridad', ShieldAlert],
        ['/mes/inventory', 'Consultar inventario', PackageOpen],
    ] as const;
    return (
        <>
            <Head title="Home" />
            <div className="mes-page">
                <div className="mes-hero">
                    <div>
                        <p className="eyebrow">INSETTI · OPERACIÓN BSF</p>
                        <h1>Centro de operación</h1>
                        <p>Planifica, ejecuta y controla el proceso completo</p>
                    </div>
                    <div className="hero-mark">
                        <span>Insect</span>MES
                        <small>Bioconversión inteligente</small>
                    </div>
                </div>
                <div className="shortcut-grid">
                    {shortcuts.map(([href, title, Icon]) => (
                        <Link key={href} href={href} className="shortcut-card">
                            <Icon />
                            <span>{title}</span>
                            <ArrowRight className="ml-auto size-4 text-slate-400" />
                        </Link>
                    ))}
                </div>
                <div className="stat-grid">
                    {stats.map((stat) => (
                        <article className="stat-card" key={stat.label}>
                            <span>{stat.label}</span>
                            <strong>
                                {stat.value.toLocaleString('es-MX')}
                            </strong>
                            <small>{stat.detail}</small>
                            <i />
                        </article>
                    ))}
                </div>
                <div className="content-grid">
                    <section className="mes-card">
                        <header>
                            <div>
                                <p className="eyebrow">ACTIVIDAD</p>
                                <h2>Últimas capturas</h2>
                            </div>
                            <Link href="/mes/control">
                                Abrir panel <ArrowRight />
                            </Link>
                        </header>
                        <div className="table-shell">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Fecha</th>
                                        <th>Proceso</th>
                                        <th>Serial</th>
                                        <th>Cantidad</th>
                                        <th>Operador</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentRuns.map((run) => (
                                        <tr key={run.id}>
                                            <td>
                                                {new Date(
                                                    run.occurred_at,
                                                ).toLocaleString('es-MX')}
                                            </td>
                                            <td>{run.operation}</td>
                                            <td className="code-cell">
                                                {run.serial}
                                            </td>
                                            <td>
                                                {Number(
                                                    run.quantity_out,
                                                ).toLocaleString('es-MX')}{' '}
                                                {run.unit}
                                            </td>
                                            <td>{run.operator}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    <aside className="mes-card">
                        <header>
                            <div>
                                <p className="eyebrow">INVENTARIO</p>
                                <h2>Por tipo de parte</h2>
                            </div>
                            <Boxes />
                        </header>
                        <div className="summary-list">
                            {inventoryByType.map((row) => (
                                <div key={row.type}>
                                    <span>{row.type}</span>
                                    <b>{row.total}</b>
                                </div>
                            ))}
                        </div>
                        <Link className="primary-link" href="/mes/inventory">
                            Ver contenedores <ArrowRight />
                        </Link>
                    </aside>
                </div>
            </div>
        </>
    );
}

Dashboard.layout = { breadcrumbs: [{ title: 'Home', href: '/dashboard' }] };
