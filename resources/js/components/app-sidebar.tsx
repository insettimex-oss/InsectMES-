import { usePage } from '@inertiajs/react';
import {
    BadgeCheck,
    BookOpenCheck,
    Cable,
    DatabaseBackup,
    ScrollText,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
} from '@/components/ui/sidebar';
import menu from '@/lib/rev031-menu.json';

const bindings: Record<string, string> = {
    bom: 'bom',
    'bsf-cycle': 'bsf-cycle',
    operations: 'operations',
    parametros: 'parameters',
    parts: 'parts',
    'process-routing': 'routing',
    'work-centers': 'wcs',
    checklist: 'checklist',
    oc: 'oc',
    proveedores: 'proveedores',
    'recibo-oc': 'receive',
    'cost-structure': 'coststructure',
    contenedores: 'containers',
    inventario: 'inventory',
    lotes: 'lots',
    trazabilidad: 'trace',
    ubicaciones: 'locations',
    unidades: 'units',
    'calendario-pm': 'calendario-pm',
    'checklist-pm': 'checklist-pm',
    equipos: 'equipos',
    mrp: 'mrp',
    prp: 'prp',
    'job-manager': 'job-manager',
    'capacity-planning': 'capacity-planning',
    empresa: 'empresa',
    etiquetas: 'labels',
    settings: 'settings',
    'setup-tables': 'setup',
    'control-panel': 'control',
    bioconversion: 'rearing',
    reproduccion: 'reproduction',
    postproceso: 'postprocess',
    empaque: 'pack',
    reportes: 'reports',
    envios: 'shipping',
    pedidos: 'pedidos',
};
type MenuNode = { id: string; name: string; items?: MenuNode[] };
const native = [
    {
        title: 'Fase 0',
        path: 'governance',
        permission: 'governance.read',
        icon: BookOpenCheck,
    },
    {
        title: 'Validación y firmas',
        path: 'validation',
        permission: 'validation.read',
        icon: BadgeCheck,
    },
    {
        title: 'Integraciones',
        path: 'integrations',
        permission: 'integrations.read',
        icon: Cable,
    },
    {
        title: 'Auditoría',
        path: 'audit',
        permission: 'audit.read',
        icon: ScrollText,
    },
    {
        title: 'Continuidad',
        path: 'continuity',
        permission: 'continuity.read',
        icon: DatabaseBackup,
    },
];
function MenuEntry({ node }: { node: MenuNode }) {
    if (['gobierno', 'seguridad'].includes(node.id)) return null;
    if (node.items?.length)
        return (
            <details className="rev031-native-menu">
                <summary>{node.name}</summary>
                <div>
                    {node.items.map((child) => (
                        <MenuEntry key={child.id} node={child} />
                    ))}
                </div>
            </details>
        );
    return (
        <a href={`/dashboard#/${bindings[node.id] ?? 'home'}`}>{node.name}</a>
    );
}
export function AppSidebar() {
    const { auth } = usePage().props;
    const permitted = (permission: string) =>
        auth.user.permissions.includes(permission);
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="/dashboard">
                                <AppLogo />
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <nav className="rev031-native-navigation">
                    <a href="/dashboard#/home">Inicio</a>
                    {menu.map((node) => (
                        <MenuEntry key={node.id} node={node} />
                    ))}
                    <p className="rev031-native-caption">GOBERNAR</p>
                    {native
                        .filter((item) => permitted(item.permission))
                        .map(({ title, path, icon: Icon }) => (
                            <a key={path} href={`/mes/${path}`}>
                                <Icon size={18} />
                                {title}
                            </a>
                        ))}
                    {permitted('users.manage') && (
                        <a href="/mes/users">
                            <Users size={18} />
                            Usuarios y accesos
                        </a>
                    )}
                </nav>
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
