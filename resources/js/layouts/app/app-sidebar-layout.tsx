import Rev031 from '@/components/rev031-shell';
import { usePage } from '@inertiajs/react';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const page = usePage();
    // Personal account forms remain available without loading business data.
    if (page.url.startsWith('/settings/') && !page.props.workspaceBootstrap) {
        return <main className="mx-auto min-h-screen w-full max-w-7xl p-4">{children}</main>;
    }
    return <Rev031 nativeTitle={breadcrumbs.at(-1)?.title}>{children}</Rev031>;
}
