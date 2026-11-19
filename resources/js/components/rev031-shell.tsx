import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AppearanceMenu } from '@/components/appearance-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/hooks/use-initials';
import { UserMenuContent } from '@/components/user-menu-content';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import markup from '@/lib/rev031-markup.json';
import build from '@/lib/rev031-build.json';

type Bootstrap031 = {
    assetHash?: string;
    ready: boolean;
    message?: string;
    state: Record<string, unknown>;
    revision: number;
    fingerprint: string;
    session: Record<string, unknown>;
    security: Record<string, unknown>;
    levels: Record<string, number>;
    nativeNavigation: { id: string; name: string; href: string }[];
    booted?: boolean;
    nativePage?: boolean;
    nativeTitle?: string;
};
type Window031 = Window & {
    insectLaravel: Bootstrap031;
    persistInsectState: (
        state: Record<string, unknown>,
        screen: string,
    ) => void;
};

export default function Rev031({
    children,
    nativeTitle,
}: {
    children?: ReactNode;
    nativeTitle?: string;
}) {
    const page = usePage();
    const { auth } = page.props;
    const getInitials = useInitials();
    const mounted = useRef(false);
    const [status, setStatus] = useState('');
    const [slot, setSlot] = useState<HTMLElement | null>(null);
    const [appearanceSlot, setAppearanceSlot] = useState<HTMLElement | null>(
        null,
    );
    const [contentSlot, setContentSlot] = useState<HTMLElement | null>(null);
    const [error, setError] = useState(false);
    const [ready, setReady] = useState(false);
    const [accountOpen, setAccountOpen] = useState(false);
    const [accountOffset, setAccountOffset] = useState(6);
    useEffect(() => {
        const close = (event: Event) => {
            if ((event as CustomEvent).detail !== 'account')
                setAccountOpen(false);
        };
        window.addEventListener('insectmes:header-menu', close);
        return () => window.removeEventListener('insectmes:header-menu', close);
    }, []);
    useEffect(() => {
        if (mounted.current) return;
        mounted.current = true;
        const host = window as unknown as Window031;
        let last = '';
        const shell = () => {
            let element = document.getElementById('laravel-native-controls');
            if (!element) {
                element = document.createElement('div');
                element.id = 'laravel-native-controls';
                document.querySelector('.menu29-tools')?.append(element);
            }
            setSlot(element);
            let appearance = document.getElementById(
                'laravel-appearance-control',
            );
            if (!appearance) {
                appearance = document.createElement('div');
                appearance.id = 'laravel-appearance-control';
            }
            const tools = document.querySelector('.menu29-tools');
            if (tools)
                tools.insertBefore(
                    appearance,
                    tools.querySelector('.assistant-launch30') ??
                        tools.querySelector('.goto-wrap'),
                );
            setAppearanceSlot(appearance);
            if (children)
                setContentSlot(document.getElementById('laravel-native-page'));
        };
        const logout = () =>
            router.post(
                '/logout',
                {},
                { onSuccess: () => location.assign('/login') },
            );
        const nativeNavigation = (event: MouseEvent) => {
            const target = event.target as Element;
            if (target.closest('[data-test="logout-button"]')) {
                event.preventDefault();
                event.stopImmediatePropagation();
                logout();
                return;
            }
            const anchor = target.closest(
                'a[href]',
            ) as HTMLAnchorElement | null;
            if (
                anchor &&
                anchor.origin === location.origin &&
                /^\/(mes|settings)\//.test(anchor.pathname)
            ) {
                event.preventDefault();
                event.stopImmediatePropagation();
                location.assign(anchor.href);
            }
        };
        document.addEventListener('click', nativeNavigation, true);
        window.addEventListener('insectmes:shell', shell);
        window.addEventListener('insectmes:logout', logout);
        const start = async () => {
            try {
                const embedded = page.props.workspaceBootstrap as
                    | Bootstrap031
                    | undefined;
                let bootstrap = embedded;
                if (!bootstrap) {
                    const response = await fetch('/mes/rev031/bootstrap', {
                        headers: { Accept: 'application/json' },
                        credentials: 'same-origin',
                    });
                    if (!response.ok)
                        throw new Error(
                            'No se pudo recuperar la sesión de InsectMES. Recarga la página.',
                        );
                    bootstrap = (await response.json()) as Bootstrap031;
                }
                if (!bootstrap.ready) throw new Error(bootstrap.message);
                host.insectLaravel = bootstrap;
                bootstrap.nativePage = Boolean(children);
                bootstrap.nativeTitle = nativeTitle;
                host.persistInsectState = (state, screen) => {
                    if (!host.insectLaravel.booted) return;
                    const serialized = JSON.stringify(state);
                    if (serialized === last) return;
                    const token =
                        document.cookie
                            .split('; ')
                            .find((part) => part.startsWith('XSRF-TOKEN='))
                            ?.slice(11) ?? '';
                    const xhr = new XMLHttpRequest();
                    // The supplied transaction engine is synchronous. A rejected server commit throws
                    // here so its existing rollback handlers keep the entire operation atomic.
                    xhr.open('POST', '/mes/rev031/state', false);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.setRequestHeader('Accept', 'application/json');
                    xhr.setRequestHeader(
                        'X-XSRF-TOKEN',
                        decodeURIComponent(token),
                    );
                    try {
                        xhr.send(
                            JSON.stringify({
                                state,
                                screen,
                                revision: bootstrap.revision,
                                fingerprint: bootstrap.fingerprint,
                            }),
                        );
                    } catch {
                        setError(true);
                        setStatus(
                            'No se pudo guardar. Conserva esta pantalla y vuelve a intentarlo.',
                        );
                        throw new Error('No se pudo guardar en Laravel.');
                    }
                    let result: {
                        revision: number;
                        fingerprint: string;
                        message?: string;
                        errors?: Record<string, string[]>;
                    };
                    try {
                        result = JSON.parse(xhr.responseText);
                    } catch {
                        throw new Error(
                            'El servidor no devolvió una confirmación de guardado.',
                        );
                    }
                    if (xhr.status < 200 || xhr.status >= 300) {
                        const message = result.errors
                            ? Object.values(result.errors).flat().join(' ')
                            : (result.message ?? 'No se pudo guardar.');
                        setError(true);
                        setStatus(message);
                        throw new Error(message);
                    }
                    bootstrap.revision = result.revision;
                    bootstrap.fingerprint = result.fingerprint;
                    last = serialized;
                    setError(false);
                    setStatus('');
                };
                sessionStorage.setItem(
                    'InsectMES_Laravel_Rev031_session',
                    JSON.stringify(bootstrap.session),
                );
                let css = document.getElementById(
                    'rev031-style',
                ) as HTMLLinkElement | null;
                if (!css) {
                    css = document.createElement('link');
                    css.rel = 'stylesheet';
                    css.href = `/rev031/assets/app.css?v=${bootstrap.assetHash ?? build.hash}`;
                    css.id = 'rev031-style';
                    document.head.append(css);
                }
                if (!css.sheet) {
                    await new Promise<void>((resolve, reject) => {
                        css.addEventListener('load', () => resolve(), {
                            once: true,
                        });
                        css.addEventListener(
                            'error',
                            () =>
                                reject(
                                    new Error(
                                        'No se pudieron cargar los estilos de InsectMES.',
                                    ),
                                ),
                            { once: true },
                        );
                    });
                }
                const script = document.createElement('script');
                script.src =
                    document.querySelector<HTMLLinkElement>(
                        'link[rel="preload"][as="script"][href*="/rev031/assets/app.js"]',
                    )?.href ??
                    `/rev031/assets/app.js?v=${bootstrap.assetHash ?? build.hash}`;
                script.id = 'rev031-engine';
                script.onerror = () => {
                    setError(true);
                    setStatus('No se pudo cargar Rev031. Recarga la página.');
                };
                script.onload = () => {
                    shell();
                    setReady(true);
                    setStatus('');
                };
                document.body.append(script);
            } catch (cause) {
                setError(true);
                setStatus(
                    cause instanceof Error ? cause.message : String(cause),
                );
            }
        };
        void start();
        // Main navigation between this engine and native pages uses full document navigation.
    }, []);
    return (
        <>
            <Head title="InsectMES" />
            <div
                style={{ visibility: ready ? 'visible' : 'hidden' }}
                dangerouslySetInnerHTML={{ __html: markup }}
            />
            {slot &&
                createPortal(
                    <>
                        <DropdownMenu
                            modal={false}
                            open={accountOpen}
                            onOpenChange={(value) => {
                                if (value) {
                                    const bar = document
                                        .querySelector('.menu29-bar')
                                        ?.getBoundingClientRect();
                                    const trigger = document
                                        .querySelector(
                                            '.laravel-account-trigger',
                                        )
                                        ?.getBoundingClientRect();
                                    setAccountOffset(
                                        bar && trigger
                                            ? Math.max(
                                                  6,
                                                  bar.bottom -
                                                      trigger.bottom +
                                                      6,
                                              )
                                            : 6,
                                    );
                                    window.dispatchEvent(
                                        new CustomEvent(
                                            'insectmes:header-menu',
                                            { detail: 'account' },
                                        ),
                                    );
                                }
                                setAccountOpen(value);
                            }}
                        >
                            <DropdownMenuTrigger asChild>
                                <button
                                    className="laravel-account-trigger"
                                    aria-label="Menú de la cuenta"
                                >
                                    <Avatar className="h-8 w-8 overflow-hidden rounded-full">
                                        <AvatarImage
                                            src={auth.user.avatar}
                                            alt={auth.user.name}
                                        />
                                        <AvatarFallback className="bg-neutral-200 text-black dark:bg-neutral-700 dark:text-white">
                                            {getInitials(auth.user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                sideOffset={accountOffset}
                                collisionPadding={8}
                                className="header-menu37 min-w-56"
                            >
                                <UserMenuContent user={auth.user} />
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </>,
                    slot,
                )}
            {appearanceSlot && createPortal(<AppearanceMenu />, appearanceSlot)}
            {contentSlot && createPortal(children, contentSlot)}
            <div
                className="laravel-save-status"
                role={error ? 'alert' : 'status'}
            >
                {status}
                {error && (
                    <a href="/dashboard" className="ml-3 underline">
                        Recargar
                    </a>
                )}
            </div>
        </>
    );
}
