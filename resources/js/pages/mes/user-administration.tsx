import { useMemo, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { KeyRound, Pencil, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { MesRecordDialog } from '@/components/mes-record-dialog';

export type UserAccount = {
    id: number;
    name: string;
    email: string;
    company: string;
    role_id: number;
    role: string;
    role_slug: string;
    area: string;
    is_active: boolean;
    must_change_password: boolean;
    email_verified_at: string | null;
    permissions: string[];
};

export type AccessRole = {
    id: number;
    slug: string;
    name: string;
    area: string;
    description: string;
    permissions: string[];
};

export type AccessPermission = {
    key: string;
    module: string;
    action: 'read' | 'write' | 'approve' | 'admin' | 'manage';
    name: string;
    description: string;
};

type FormData = {
    name: string;
    email: string;
    company: string;
    role_id: number | '';
    password: string;
    password_confirmation: string;
    permissions: string[];
    is_active: boolean;
    must_change_password: boolean;
};

const moduleNames: Record<string, string> = {
    dashboard: 'Resumen',
    planning: 'Planeación',
    production: 'Producción',
    inventory: 'Inventario',
    traceability: 'Trazabilidad',
    quality: 'Calidad',
    laboratory: 'Laboratorio',
    environment: 'Ambiente',
    biosecurity: 'Bioseguridad',
    performance: 'OEE y paros',
    maintenance: 'Mantenimiento',
    engineering: 'Ingeniería',
    governance: 'Gobierno',
    validation: 'Validación y firmas',
    integrations: 'Integraciones',
    audit: 'Auditoría',
    continuity: 'Continuidad',
    administration: 'Configuración',
    costs: 'Costos',
    users: 'Usuarios',
};

const actionNames: Record<string, string> = {
    read: 'Lectura',
    write: 'Escritura',
    approve: 'Aprobación',
    admin: 'Administración',
    manage: 'Administración',
};

export function UserAdministration({
    users,
    roles,
    permissions,
}: {
    users: UserAccount[];
    roles: AccessRole[];
    permissions: AccessPermission[];
}) {
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<UserAccount | null>(null);
    const defaultRole =
        roles.find((role) => role.slug === 'operator') ?? roles[0];
    const form = useForm<FormData>({
        name: '',
        email: '',
        company: 'Insetti',
        role_id: defaultRole?.id ?? '',
        password: '',
        password_confirmation: '',
        permissions: defaultRole?.permissions ?? [],
        is_active: true,
        must_change_password: true,
    });
    const groupedPermissions = useMemo(
        () =>
            permissions.reduce<Record<string, AccessPermission[]>>(
                (groups, permission) => {
                    (groups[permission.module] ??= []).push(permission);
                    return groups;
                },
                {},
            ),
        [permissions],
    );
    const selectedRole = roles.find(
        (role) => role.id === Number(form.data.role_id),
    );

    function createUser() {
        setEditing(null);
        form.setData({
            name: '',
            email: '',
            company: 'Insetti',
            role_id: defaultRole?.id ?? '',
            password: '',
            password_confirmation: '',
            permissions: defaultRole?.permissions ?? [],
            is_active: true,
            must_change_password: true,
        });
        form.clearErrors();
        setOpen(true);
    }

    function editUser(user: UserAccount) {
        setEditing(user);
        form.setData({
            name: user.name,
            email: user.email,
            company: user.company,
            role_id: user.role_id,
            password: '',
            password_confirmation: '',
            permissions: user.permissions,
            is_active: user.is_active,
            must_change_password: user.must_change_password,
        });
        form.clearErrors();
        setOpen(true);
    }

    function changeRole(roleId: number) {
        const role = roles.find((candidate) => candidate.id === roleId);
        form.setData((current) => ({
            ...current,
            role_id: roleId,
            permissions: role?.permissions ?? [],
        }));
    }

    function togglePermission(key: string) {
        form.setData(
            'permissions',
            form.data.permissions.includes(key)
                ? form.data.permissions.filter(
                      (permission) => permission !== key,
                  )
                : [...form.data.permissions, key],
        );
    }

    function submit(event: React.FormEvent) {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setOpen(false);
                form.reset('password', 'password_confirmation');
            },
        };
        if (editing) {
            form.patch(`/mes/users/${editing.id}`, options);
        } else {
            form.post('/mes/users', options);
        }
    }

    return (
        <div className="access-admin stack-xl">
            <section className="access-summary">
                <div>
                    <span className="eyebrow">CONTROL DE ACCESO</span>
                    <h2>Roles claros, permisos precisos</h2>
                    <p>
                        El rol define el acceso inicial. Los permisos
                        individuales permiten adaptar una cuenta sin alterar al
                        resto del área.
                    </p>
                </div>
                <div className="access-summary-metrics">
                    <span>
                        <Users /> <b>{users.length}</b> cuentas
                    </span>
                    <span>
                        <ShieldCheck /> <b>{roles.length}</b> roles
                    </span>
                    <span>
                        <KeyRound /> <b>{permissions.length}</b> permisos
                    </span>
                </div>
                <button
                    type="button"
                    className="primary-action"
                    onClick={createUser}
                >
                    <UserPlus /> Nuevo usuario
                </button>
            </section>

            <section className="access-directory">
                <div className="access-directory-head">
                    <div>
                        <p className="eyebrow">DIRECTORIO</p>
                        <h2>Usuarios y áreas</h2>
                    </div>
                    <span>
                        {users.filter((user) => user.is_active).length} activos
                    </span>
                </div>
                <div className="access-user-grid">
                    {users.map((user) => (
                        <article className="access-user-card" key={user.id}>
                            <div
                                className="access-user-avatar"
                                aria-hidden="true"
                            >
                                {user.name
                                    .split(' ')
                                    .slice(0, 2)
                                    .map((part) => part[0])
                                    .join('')
                                    .toUpperCase()}
                            </div>
                            <div className="access-user-main">
                                <div className="access-user-title">
                                    <div>
                                        <h3>{user.name}</h3>
                                        <p>{user.email}</p>
                                    </div>
                                    <span
                                        className={
                                            user.is_active
                                                ? 'status-chip status-ok'
                                                : 'status-chip status-muted'
                                        }
                                    >
                                        {user.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>
                                <div className="access-role-line">
                                    <ShieldCheck />
                                    <span>
                                        <b>{user.role}</b>
                                        <small>{user.area}</small>
                                    </span>
                                </div>
                                <div className="access-user-foot">
                                    <span>
                                        {user.permissions.length} permisos
                                        efectivos
                                    </span>
                                    {user.must_change_password && (
                                        <span>
                                            Cambio de contraseña requerido
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        className="secondary-action"
                                        onClick={() => editUser(user)}
                                    >
                                        <Pencil /> Editar acceso
                                    </button>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>

            <MesRecordDialog
                open={open}
                onOpenChange={setOpen}
                title={
                    editing
                        ? `Editar acceso · ${editing.name}`
                        : 'Crear usuario'
                }
                description="Asigne un rol base y ajuste únicamente las excepciones necesarias."
            >
                <form className="access-form" onSubmit={submit}>
                    <div className="form-grid three">
                        <label>
                            Nombre completo
                            <input
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData('name', event.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Correo
                            <input
                                type="email"
                                value={form.data.email}
                                onChange={(event) =>
                                    form.setData('email', event.target.value)
                                }
                                required
                            />
                        </label>
                        <label>
                            Compañía
                            <input
                                value={form.data.company}
                                onChange={(event) =>
                                    form.setData('company', event.target.value)
                                }
                                required
                            />
                        </label>
                    </div>
                    <div className="form-grid three">
                        <label>
                            Rol
                            <select
                                value={form.data.role_id}
                                onChange={(event) =>
                                    changeRole(Number(event.target.value))
                                }
                                required
                            >
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.name} · {role.area}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            {editing
                                ? 'Nueva contraseña (opcional)'
                                : 'Contraseña temporal'}
                            <input
                                type="password"
                                value={form.data.password}
                                onChange={(event) =>
                                    form.setData('password', event.target.value)
                                }
                                required={!editing}
                                autoComplete="new-password"
                            />
                        </label>
                        <label>
                            Confirmar contraseña
                            <input
                                type="password"
                                value={form.data.password_confirmation}
                                onChange={(event) =>
                                    form.setData(
                                        'password_confirmation',
                                        event.target.value,
                                    )
                                }
                                required={
                                    !editing || form.data.password.length > 0
                                }
                                autoComplete="new-password"
                            />
                        </label>
                    </div>
                    {Object.keys(form.errors).length > 0 && (
                        <div className="form-error-summary">
                            Revise los campos marcados:{' '}
                            {Object.values(form.errors).join(' ')}
                        </div>
                    )}
                    <div className="permission-heading">
                        <div>
                            <p className="eyebrow">PERMISOS EFECTIVOS</p>
                            <h3>
                                {selectedRole?.name ?? 'Rol sin seleccionar'}
                            </h3>
                            <p>{selectedRole?.description}</p>
                        </div>
                        <button
                            type="button"
                            className="secondary-action"
                            onClick={() =>
                                form.setData(
                                    'permissions',
                                    selectedRole?.permissions ?? [],
                                )
                            }
                        >
                            Restablecer al rol
                        </button>
                    </div>
                    <div className="permission-matrix">
                        {Object.entries(groupedPermissions).map(
                            ([module, modulePermissions]) => (
                                <fieldset key={module}>
                                    <legend>
                                        {moduleNames[module] ?? module}
                                    </legend>
                                    <div>
                                        {modulePermissions.map((permission) => (
                                            <label
                                                key={permission.key}
                                                title={permission.description}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={form.data.permissions.includes(
                                                        permission.key,
                                                    )}
                                                    onChange={() =>
                                                        togglePermission(
                                                            permission.key,
                                                        )
                                                    }
                                                />
                                                <span>
                                                    {actionNames[
                                                        permission.action
                                                    ] ?? permission.action}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>
                            ),
                        )}
                    </div>
                    <div className="access-form-options">
                        {editing && (
                            <label>
                                <input
                                    type="checkbox"
                                    checked={form.data.is_active}
                                    onChange={(event) =>
                                        form.setData(
                                            'is_active',
                                            event.target.checked,
                                        )
                                    }
                                />{' '}
                                Cuenta activa
                            </label>
                        )}
                        <label>
                            <input
                                type="checkbox"
                                checked={form.data.must_change_password}
                                onChange={(event) =>
                                    form.setData(
                                        'must_change_password',
                                        event.target.checked,
                                    )
                                }
                            />{' '}
                            Solicitar cambio de contraseña
                        </label>
                    </div>
                    <div className="dialog-actions">
                        <button
                            type="button"
                            className="secondary-action"
                            onClick={() => setOpen(false)}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="primary-action"
                            disabled={form.processing}
                        >
                            <ShieldCheck />{' '}
                            {editing ? 'Guardar acceso' : 'Crear usuario'}
                        </button>
                    </div>
                </form>
            </MesRecordDialog>
        </div>
    );
}
