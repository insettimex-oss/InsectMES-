import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    LogOut,
    UserRoundPen,
    Building2,
    ContactRound,
    ShieldEllipsis,
    Globe,
    Check,
    ChevronDown,
} from 'lucide-react';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { UserInfo } from '@/components/user-info';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import type { User } from '@/types';

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const [languagesOpen, setLanguagesOpen] = useState(false);

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };
    const openPlatform = (screen: string) => {
        cleanup();
        window.dispatchEvent(
            new CustomEvent('insectmes:navigate', { detail: screen }),
        );
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <UserRoundPen
                            className="mr-2 size-4 shrink-0"
                            style={{ width: 16, height: 16 }}
                        />
                        Perfil
                    </Link>
                </DropdownMenuItem>
            </DropdownMenuGroup>
            {(user.permissions.includes('administration.read') ||
                user.permissions.includes('administration.write')) && (
                <DropdownMenuItem onSelect={() => openPlatform('empresa')}>
                    <Building2
                        className="mr-2 size-4 shrink-0"
                        style={{ width: 16, height: 16 }}
                    />
                    Empresa
                </DropdownMenuItem>
            )}
            {user.permissions.includes('users.manage') && (
                <>
                    <DropdownMenuItem onSelect={() => openPlatform('users')}>
                        <ContactRound
                            className="mr-2 size-4 shrink-0"
                            style={{ width: 16, height: 16 }}
                        />
                        Usuarios
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openPlatform('profiles')}>
                        <ShieldEllipsis
                            className="mr-2 size-4 shrink-0"
                            style={{ width: 16, height: 16 }}
                        />
                        Roles
                    </DropdownMenuItem>
                </>
            )}
            <DropdownMenuItem
                onSelect={(event) => {
                    event.preventDefault();
                    setLanguagesOpen(!languagesOpen);
                }}
                aria-expanded={languagesOpen}
            >
                <Globe className="size-4 shrink-0" />
                Idioma
                <ChevronDown className="ml-auto size-3.5" />
            </DropdownMenuItem>
            {languagesOpen && (
                <DropdownMenuGroup
                    aria-label="Idiomas disponibles"
                    className="header-languages37"
                >
                    <DropdownMenuItem
                        onSelect={(event) => event.preventDefault()}
                    >
                        Español <Check className="ml-auto size-4" />
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={(event) => event.preventDefault()}
                    >
                        English
                    </DropdownMenuItem>
                </DropdownMenuGroup>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <LogOut
                        className="mr-2 size-4 shrink-0"
                        style={{ width: 16, height: 16 }}
                    />
                    Log out
                </Link>
            </DropdownMenuItem>
        </>
    );
}
