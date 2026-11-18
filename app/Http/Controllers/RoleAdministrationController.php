<?php

namespace App\Http\Controllers;

use App\Models\Permission;
use App\Models\Role;
use App\Services\AuditService;
use App\Services\RoleScreenAccess;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class RoleAdministrationController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function index(RoleScreenAccess $access): Response
    {
        abort_unless($access->allows(request()->user(), 'profiles'), 403);

        return Inertia::render('mes/roles', [
            'roles' => Role::with('permissions')->withCount('users')->orderBy('name')->get()->map(fn ($role) => [
                'id' => $role->id, 'name' => $role->name, 'slug' => $role->slug, 'area' => $role->area, 'description' => $role->description,
                'permissions' => $role->permissions->pluck('key')->all(), 'users_count' => $role->users_count, 'screens' => $access->forRole($role->id),
            ]),
            'permissions' => Permission::orderBy('module')->orderBy('key')->get(['key', 'module', 'action', 'name', 'description']),
            'screens' => $this->screenCatalog(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        return $this->save($request, new Role);
    }

    public function update(Request $request, Role $role): RedirectResponse
    {
        return $this->save($request, $role);
    }

    /** @return list<array{id:string,name:string,module:string}> */
    private function screenCatalog(): array
    {
        $json = file_get_contents(resource_path('rev031/screen-catalog.json'));
        if ($json === false) {
            throw new \RuntimeException('No se pudo leer el catálogo de pantallas.');
        }

        return json_decode($json, true, flags: JSON_THROW_ON_ERROR);
    }

    private function save(Request $request, Role $role): RedirectResponse
    {
        abort_unless(app(RoleScreenAccess::class)->allows($request->user(), 'profiles'), 403);
        $catalog = $this->screenCatalog();
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', Rule::unique('roles', 'name')->ignore($role->id)],
            'area' => ['required', 'string', 'max:120'], 'description' => ['nullable', 'string', 'max:1000'],
            'permissions' => ['present', 'array'], 'permissions.*' => ['string', Rule::exists('permissions', 'key')],
            'screens' => ['present', 'array'], 'screens.*' => ['string', Rule::in(array_column($catalog, 'id'))],
        ]);
        DB::transaction(function () use ($request, $role, $data): void {
            $before = $role->exists ? $role->toArray() + ['permissions' => $role->permissions()->pluck('key')->all()] : null;
            if (! $role->exists) {
                $role->slug = Str::slug($data['name']).'-'.Str::lower(Str::random(6));
                $role->is_system = false;
            }
            $role->fill(['name' => $data['name'], 'area' => $data['area'], 'description' => $data['description'] ?? ''])->save();
            // Administrator remains the recovery role; never remove its complete access.
            $keys = $role->slug === 'admin' ? Permission::pluck('key')->all() : $data['permissions'];
            $role->permissions()->sync(Permission::whereIn('key', $keys)->pluck('id')->all());
            if ($role->slug !== 'admin') {
                DB::table('mes_settings')->updateOrInsert(['key' => 'role.screens.'.$role->id], ['value' => json_encode(array_values(array_unique($data['screens'])), JSON_THROW_ON_ERROR), 'updated_at' => now(), 'created_at' => now()]);
            }
            $this->audit->record($request, $before ? 'ROLE_UPDATED' : 'ROLE_CREATED', $role, 'Configuración de rol, pantallas y acciones', $before, $data);
        });
        Inertia::flash('toast', ['type' => 'success', 'message' => 'Rol guardado.']);

        return back();
    }
}
