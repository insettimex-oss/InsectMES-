<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class UserAdministrationController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180', 'unique:users,email'],
            'company' => ['required', 'string', 'max:120'],
            'role_id' => ['required', 'exists:roles,id'],
            'password' => ['required', 'confirmed', Password::min(10)->letters()->numbers()->symbols()],
            'permissions' => ['array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'key')],
            'must_change_password' => ['boolean'],
        ]);

        $user = DB::transaction(function () use ($data, $request): User {
            $role = Role::query()->findOrFail((int) $data['role_id']);
            $user = User::query()->create([
                'name' => $data['name'],
                'email' => mb_strtolower($data['email']),
                'password' => $data['password'],
                'role' => $role->slug,
                'role_id' => $role->id,
                'company' => $data['company'],
                'is_active' => true,
                'must_change_password' => (bool) ($data['must_change_password'] ?? true),
                'email_verified_at' => now(),
            ]);
            $this->syncPermissionOverrides($user, $role, $data['permissions'] ?? []);
            $this->audit->record($request, 'USER_CREATED', $user, 'Alta de usuario desde administración', null, [
                'name' => $user->name, 'email' => $user->email, 'role' => $role->slug,
                'permissions' => $user->effectivePermissionKeys(),
            ]);

            return $user;
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "Usuario {$user->name} creado correctamente."]);

        return back();
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180', Rule::unique('users', 'email')->ignore($user->id)],
            'company' => ['required', 'string', 'max:120'],
            'role_id' => ['required', 'exists:roles,id'],
            'password' => ['nullable', 'confirmed', Password::min(10)->letters()->numbers()->symbols()],
            'permissions' => ['array'],
            'permissions.*' => ['string', Rule::exists('permissions', 'key')],
            'is_active' => ['required', 'boolean'],
            'must_change_password' => ['boolean'],
        ]);
        $role = Role::query()->findOrFail((int) $data['role_id']);
        if ($user->is($request->user()) && ! (bool) $data['is_active']) {
            throw ValidationException::withMessages(['is_active' => 'No puede desactivar su propia cuenta.']);
        }
        $this->protectLastAdministrator($user, $role, (bool) $data['is_active']);

        DB::transaction(function () use ($data, $request, $role, $user): void {
            $before = [
                'name' => $user->name, 'email' => $user->email, 'role' => $user->role,
                'is_active' => $user->is_active, 'permissions' => $user->effectivePermissionKeys(),
            ];
            $attributes = [
                'name' => $data['name'],
                'email' => mb_strtolower($data['email']),
                'role' => $role->slug,
                'role_id' => $role->id,
                'company' => $data['company'],
                'is_active' => (bool) $data['is_active'],
                'must_change_password' => (bool) ($data['must_change_password'] ?? false),
            ];
            if (! empty($data['password'])) {
                $attributes['password'] = $data['password'];
                $attributes['must_change_password'] = true;
            }
            $user->update($attributes);
            $this->syncPermissionOverrides($user, $role, $data['permissions'] ?? []);
            $this->audit->record($request, 'USER_UPDATED', $user, 'Actualización de rol y permisos', $before, [
                'name' => $user->name, 'email' => $user->email, 'role' => $role->slug,
                'is_active' => $user->is_active, 'permissions' => $user->effectivePermissionKeys(),
            ]);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => "Acceso de {$user->name} actualizado."]);

        return back();
    }

    /** @param list<string> $selectedKeys */
    private function syncPermissionOverrides(User $user, Role $role, array $selectedKeys): void
    {
        $roleKeys = $role->permissions()->pluck('permissions.key')->all();
        $selected = array_fill_keys($selectedKeys, true);
        $roleDefaults = array_fill_keys($roleKeys, true);
        $sync = [];

        foreach (Permission::query()->get(['id', 'key']) as $permission) {
            $isSelected = isset($selected[$permission->key]);
            $isRoleDefault = isset($roleDefaults[$permission->key]);
            if ($isSelected !== $isRoleDefault) {
                $sync[$permission->id] = ['allowed' => $isSelected];
            }
        }

        $user->permissionOverrides()->sync($sync);
        $user->unsetRelation('assignedRole');
    }

    private function protectLastAdministrator(User $user, Role $newRole, bool $willBeActive): void
    {
        $adminRole = Role::query()->where('slug', 'admin')->firstOrFail();
        if ($user->role_id !== $adminRole->id || ($newRole->id === $adminRole->id && $willBeActive)) {
            return;
        }
        $activeAdministrators = User::query()->where('role_id', $adminRole->id)->where('is_active', true)->count();
        if ($activeAdministrators <= 1) {
            throw ValidationException::withMessages(['role_id' => 'Debe permanecer al menos un administrador activo.']);
        }
    }
}
