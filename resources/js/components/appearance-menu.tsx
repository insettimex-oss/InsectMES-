import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';

const options = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Oscuro', icon: Moon },
    { value: 'system' as const, label: 'Sistema', icon: Monitor },
];

export function AppearanceMenu() {
    const [open, setOpen] = useState(false);
    const [offset, setOffset] = useState(6);
    useEffect(() => {
        const close = (event: Event) => {
            if ((event as CustomEvent).detail !== 'appearance') setOpen(false);
        };
        window.addEventListener('insectmes:header-menu', close);
        return () => window.removeEventListener('insectmes:header-menu', close);
    }, []);
    const { appearance, resolvedAppearance, updateAppearance } =
        useAppearance();
    const ActiveIcon = resolvedAppearance === 'dark' ? Moon : Sun;

    const selectAppearance = (value: Appearance) => {
        updateAppearance(value);
    };

    return (
        <DropdownMenu
            modal={false}
            open={open}
            onOpenChange={(value) => {
                if (value) {
                    const bar = document
                        .querySelector('.menu29-bar')
                        ?.getBoundingClientRect();
                    const trigger = document
                        .querySelector('#laravel-appearance-control button')
                        ?.getBoundingClientRect();
                    setOffset(
                        bar && trigger
                            ? Math.max(6, bar.bottom - trigger.bottom + 6)
                            : 6,
                    );
                    window.dispatchEvent(
                        new CustomEvent('insectmes:header-menu', {
                            detail: 'appearance',
                        }),
                    );
                }
                setOpen(value);
            }}
        >
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="appearance-trigger"
                    aria-label="Cambiar apariencia"
                    title="Cambiar apariencia"
                >
                    <ActiveIcon />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                sideOffset={offset}
                collisionPadding={8}
                className="header-menu37 w-44"
            >
                <DropdownMenuLabel>Apariencia</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {options.map(({ value, label, icon: Icon }) => (
                    <DropdownMenuItem
                        key={value}
                        onSelect={() => selectAppearance(value)}
                    >
                        <Icon />
                        <span>{label}</span>
                        {appearance === value && (
                            <Check className="ml-auto text-[#78ad36]" />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
