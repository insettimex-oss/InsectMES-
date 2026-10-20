import { Link } from '@inertiajs/react';
import {
    Boxes,
    BookOpenCheck,
    CalendarClock,
    ChartNoAxesCombined,
    ClipboardCheck,
    ClipboardList,
    Cog,
    Factory,
    GitBranch,
    LayoutDashboard,
    MapPin,
    PackageOpen,
    Route,
    Settings2,
    DatabaseBackup,
    Scale,
    ScrollText,
    ShieldAlert,
    Sprout,
    Thermometer,
    Users,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';

const groups: Array<{ label: string; items: NavItem[] }> = [
    {
        label: 'Inicio',
        items: [
            { title: 'Resumen', href: '/dashboard', icon: LayoutDashboard },
        ],
    },
    {
        label: 'Planificar',
        items: [{ title: 'Órdenes', href: '/mes/orders', icon: CalendarClock }],
    },
    {
        label: 'Ejecutar',
        items: [
            {
                title: 'Piso de producción',
                href: '/mes/control',
                icon: Factory,
            },
            { title: 'Guardería', href: '/mes/nursery', icon: Sprout },
        ],
    },
    {
        label: 'Controlar',
        items: [
            { title: 'Calidad', href: '/mes/quality', icon: ClipboardCheck },
            { title: 'Ambiente', href: '/mes/environment', icon: Thermometer },
            {
                title: 'Balance de masa',
                href: '/mes/mass-balance',
                icon: Scale,
            },
            {
                title: 'Bioseguridad',
                href: '/mes/biosecurity',
                icon: ShieldAlert,
            },
        ],
    },
    {
        label: 'Materiales',
        items: [
            {
                title: 'Contenedores',
                href: '/mes/inventory',
                icon: PackageOpen,
            },
            { title: 'Trazabilidad', href: '/mes/trace', icon: ClipboardList },
        ],
    },
    {
        label: 'Ingeniería',
        items: [
            { title: 'Rutas de proceso', href: '/mes/routing', icon: Route },
            { title: 'BOM', href: '/mes/bom', icon: GitBranch },
            { title: 'Artículos', href: '/mes/parts', icon: Boxes },
            { title: 'Ubicaciones', href: '/mes/locations', icon: MapPin },
            { title: 'Operaciones', href: '/mes/operations', icon: Cog },
        ],
    },
    {
        label: 'Gobernar',
        items: [
            { title: 'Fase 0', href: '/mes/governance', icon: BookOpenCheck },
            { title: 'Auditoría', href: '/mes/audit', icon: ScrollText },
            {
                title: 'Continuidad',
                href: '/mes/continuity',
                icon: DatabaseBackup,
            },
        ],
    },
    {
        label: 'Administración',
        items: [
            { title: 'Parámetros', href: '/mes/parameters', icon: Settings2 },
            { title: 'Costos', href: '/mes/costs', icon: ChartNoAxesCombined },
            { title: 'Usuarios', href: '/mes/users', icon: Users },
        ],
    },
];

export function AppSidebar() {
    return (
        <Sidebar collapsible="icon" variant="inset" className="insect-sidebar">
            <SidebarHeader className="px-3 py-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {groups.map((group) => (
                    <NavMain
                        key={group.label}
                        label={group.label}
                        items={group.items}
                    />
                ))}
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
