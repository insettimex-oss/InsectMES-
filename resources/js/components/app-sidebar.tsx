import { Link, usePage } from '@inertiajs/react';
import {
    Boxes,
    BadgeCheck,
    BookOpenCheck,
    CalendarClock,
    Cable,
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
    Truck,
    Users,
    Utensils,
    Wrench,
    Gauge,
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

type AccessNavItem = NavItem & { permission: string };

const groups: Array<{ label: string; items: AccessNavItem[] }> = [
    {
        label: 'Inicio',
        items: [
            {
                title: 'Resumen',
                href: '/dashboard',
                icon: LayoutDashboard,
                permission: 'dashboard.read',
            },
        ],
    },
    {
        label: 'Planificar',
        items: [
            {
                title: 'Órdenes',
                href: '/mes/orders',
                icon: CalendarClock,
                permission: 'planning.read',
            },
        ],
    },
    {
        label: 'Ejecutar',
        items: [
            {
                title: 'Piso de producción',
                href: '/mes/control',
                icon: Factory,
                permission: 'production.read',
            },
            {
                title: 'Guardería',
                href: '/mes/nursery',
                icon: Sprout,
                permission: 'production.read',
            },
            {
                title: 'Alimentación',
                href: '/mes/feeding',
                icon: Utensils,
                permission: 'production.read',
            },
        ],
    },
    {
        label: 'Controlar',
        items: [
            {
                title: 'Calidad',
                href: '/mes/quality',
                icon: ClipboardCheck,
                permission: 'quality.read',
            },
            {
                title: 'OEE y paros',
                href: '/mes/performance',
                icon: Gauge,
                permission: 'performance.read',
            },
            {
                title: 'Ambiente',
                href: '/mes/environment',
                icon: Thermometer,
                permission: 'environment.read',
            },
            {
                title: 'Balance de masa',
                href: '/mes/mass-balance',
                icon: Scale,
                permission: 'production.read',
            },
            {
                title: 'Bioseguridad',
                href: '/mes/biosecurity',
                icon: ShieldAlert,
                permission: 'biosecurity.read',
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
                permission: 'inventory.read',
            },
            {
                title: 'Trazabilidad',
                href: '/mes/trace',
                icon: ClipboardList,
                permission: 'traceability.read',
            },
            {
                title: 'Logística y embarques',
                href: '/mes/logistics',
                icon: Truck,
                permission: 'logistics.read',
            },
        ],
    },
    {
        label: 'Ingeniería',
        items: [
            {
                title: 'Rutas de proceso',
                href: '/mes/routing',
                icon: Route,
                permission: 'engineering.read',
            },
            {
                title: 'BOM',
                href: '/mes/bom',
                icon: GitBranch,
                permission: 'engineering.read',
            },
            {
                title: 'Artículos',
                href: '/mes/parts',
                icon: Boxes,
                permission: 'engineering.read',
            },
            {
                title: 'Ubicaciones',
                href: '/mes/locations',
                icon: MapPin,
                permission: 'engineering.read',
            },
            {
                title: 'Operaciones',
                href: '/mes/operations',
                icon: Cog,
                permission: 'engineering.read',
            },
            {
                title: 'Mantenimiento',
                href: '/mes/maintenance',
                icon: Wrench,
                permission: 'maintenance.read',
            },
        ],
    },
    {
        label: 'Gobernar',
        items: [
            {
                title: 'Fase 0',
                href: '/mes/governance',
                icon: BookOpenCheck,
                permission: 'governance.read',
            },
            {
                title: 'Validación y firmas',
                href: '/mes/validation',
                icon: BadgeCheck,
                permission: 'validation.read',
            },
            {
                title: 'Integraciones',
                href: '/mes/integrations',
                icon: Cable,
                permission: 'integrations.read',
            },
            {
                title: 'Auditoría',
                href: '/mes/audit',
                icon: ScrollText,
                permission: 'audit.read',
            },
            {
                title: 'Continuidad',
                href: '/mes/continuity',
                icon: DatabaseBackup,
                permission: 'continuity.read',
            },
        ],
    },
    {
        label: 'Administración',
        items: [
            {
                title: 'Parámetros',
                href: '/mes/parameters',
                icon: Settings2,
                permission: 'administration.read',
            },
            {
                title: 'Costos',
                href: '/mes/costs',
                icon: ChartNoAxesCombined,
                permission: 'costs.read',
            },
            {
                title: 'Usuarios y accesos',
                href: '/mes/users',
                icon: Users,
                permission: 'users.manage',
            },
        ],
    },
];

export function AppSidebar() {
    const permissions = usePage().props.auth.user?.permissions ?? [];
    const visibleGroups = groups
        .map((group) => ({
            ...group,
            items: group.items.filter((item) =>
                permissions.includes(item.permission),
            ),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <Sidebar collapsible="icon" variant="inset" className="insect-sidebar">
            <SidebarHeader className="px-3 py-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            className="h-20 group-data-[collapsible=icon]:h-8!"
                            asChild
                        >
                            <Link href="/dashboard" prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {visibleGroups.map((group) => (
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
