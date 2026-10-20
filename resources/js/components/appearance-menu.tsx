import { Check, Monitor, Moon, Sun } from 'lucide-react';
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
    const { appearance, resolvedAppearance, updateAppearance } =
        useAppearance();
    const ActiveIcon = resolvedAppearance === 'dark' ? Moon : Sun;

    const selectAppearance = (value: Appearance) => {
        updateAppearance(value);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    type="button"
                    className="appearance-trigger"
                    aria-label="Cambiar apariencia"
                    title="Cambiar apariencia"
                >
                    <ActiveIcon />
                    <span className="hidden sm:inline">Apariencia</span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
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
