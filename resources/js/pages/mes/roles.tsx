import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { Pencil, Plus, ShieldEllipsis } from 'lucide-react';
import { MesRecordDialog } from '@/components/mes-record-dialog';
import {
    actionNames,
    moduleNames,
    type AccessPermission,
    type AccessRole,
} from './user-administration';

type Screen = { id: string; name: string; module: string };
type Role = AccessRole & { users_count: number; screens: string[] | null };

export default function Roles({
    roles,
    permissions,
    screens,
}: {
    roles: Role[];
    permissions: AccessPermission[];
    screens: Screen[];
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Role | null>(null);
    const form = useForm({
        name: '',
        area: '',
        description: '',
        permissions: [] as string[],
        screens: [] as string[],
    });
    const modules = Array.from(new Set(permissions.map((p) => p.module)));
    function edit(role: Role | null) {
        setEditing(role);
        form.setData({
            name: role?.name ?? '',
            area: role?.area ?? '',
            description: role?.description ?? '',
            permissions: role?.permissions ?? ['dashboard.read'],
            screens:
                role?.screens ??
                screens
                    .filter((s) =>
                        role
                            ? role.permissions.includes(
                                  s.module === 'users'
                                      ? 'users.manage'
                                      : s.module + '.read',
                              )
                            : s.id === 'home',
                    )
                    .map((s) => s.id),
        });
        form.clearErrors();
        setOpen(true);
    }
    function toggle(key: 'permissions' | 'screens', value: string) {
        form.setData(
            key,
            form.data[key].includes(value)
                ? form.data[key].filter((x) => x !== value)
                : [...form.data[key], value],
        );
    }
    return (
        <>
            <Head title="Roles" />
            <div className="access-admin stack-xl">
                <section className="access-summary">
                    <div>
                        <h1>Roles</h1>
                        <p>
                            Configure las pantallas disponibles y las acciones
                            permitidas para cada rol.
                        </p>
                    </div>
                    <button
                        className="primary-action"
                        onClick={() => edit(null)}
                    >
                        <Plus size={18} /> Nuevo rol
                    </button>
                </section>
                <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="p-4">Rol</th>
                                <th>Área</th>
                                <th>Usuarios</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roles.map((role) => (
                                <tr key={role.id} className="border-b">
                                    <td className="p-4">
                                        <b>{role.name}</b>
                                        <p>{role.description}</p>
                                    </td>
                                    <td>{role.area}</td>
                                    <td>{role.users_count}</td>
                                    <td className="p-3">
                                        <button
                                            className="secondary-action"
                                            onClick={() => edit(role)}
                                        >
                                            <Pencil size={16} /> Configurar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            <MesRecordDialog
                open={open}
                onOpenChange={setOpen}
                title={
                    editing ? `Configurar rol · ${editing.name}` : 'Nuevo rol'
                }
                description="Los cambios se aplican a las cuentas vinculadas a este rol."
            >
                <form
                    className="access-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const options = {
                            preserveScroll: true,
                            onSuccess: () => setOpen(false),
                        };
                        if (editing)
                            form.patch(`/mes/roles/${editing.id}`, options);
                        else form.post('/mes/roles', options);
                    }}
                >
                    <div className="form-grid">
                        <label>
                            Nombre del rol
                            <input
                                required
                                value={form.data.name}
                                onChange={(e) =>
                                    form.setData('name', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Área
                            <input
                                required
                                value={form.data.area}
                                onChange={(e) =>
                                    form.setData('area', e.target.value)
                                }
                            />
                        </label>
                        <label>
                            Descripción
                            <input
                                value={form.data.description}
                                onChange={(e) =>
                                    form.setData('description', e.target.value)
                                }
                            />
                        </label>
                    </div>
                    {editing?.slug === 'admin' ? (
                        <p>
                            Administrador conserva acceso completo para
                            recuperar la administración del sistema.
                        </p>
                    ) : (
                        <>
                            <h3>Pantallas y acciones</h3>
                            <p>
                                Seleccione las pantallas y las acciones de cada
                                área. Lectura permite abrirla; escritura permite
                                capturar o modificar.
                            </p>
                            {modules.map((module) => (
                                <fieldset
                                    key={module}
                                    className="rounded-xl border p-4"
                                >
                                    <legend className="px-2 font-semibold">
                                        {moduleNames[module] ?? module}
                                    </legend>
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {screens
                                            .filter((s) => s.module === module)
                                            .map((screen) => (
                                                <label
                                                    key={screen.id}
                                                    className="flex items-center gap-2"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form.data.screens.includes(
                                                            screen.id,
                                                        )}
                                                        onChange={() =>
                                                            toggle(
                                                                'screens',
                                                                screen.id,
                                                            )
                                                        }
                                                    />
                                                    {screen.name}
                                                </label>
                                            ))}
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 border-t pt-3">
                                        {permissions
                                            .filter((p) => p.module === module)
                                            .map((permission) => (
                                                <label
                                                    key={permission.key}
                                                    title={
                                                        permission.description
                                                    }
                                                    className="flex items-center gap-2"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form.data.permissions.includes(
                                                            permission.key,
                                                        )}
                                                        onChange={() =>
                                                            toggle(
                                                                'permissions',
                                                                permission.key,
                                                            )
                                                        }
                                                    />
                                                    {actionNames[
                                                        permission.action
                                                    ] ?? permission.action}
                                                </label>
                                            ))}
                                    </div>
                                </fieldset>
                            ))}
                        </>
                    )}
                    {Object.keys(form.errors).length > 0 && (
                        <p role="alert" className="form-error-summary">
                            {Object.values(form.errors).join(' ')}
                        </p>
                    )}
                    <div className="dialog-actions">
                        <button
                            type="button"
                            className="secondary-action"
                            onClick={() => setOpen(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            className="primary-action"
                            disabled={form.processing}
                        >
                            <ShieldEllipsis size={18} /> Guardar rol
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </>
    );
}

Roles.layout = { breadcrumbs: [{ title: 'Roles', href: '/mes/roles' }] };
