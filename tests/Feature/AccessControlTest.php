<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use App\Services\RoleScreenAccess;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccessControlTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccessControlSeeder::class);
    }

    public function test_area_roles_and_test_accounts_are_created(): void
    {
        $this->assertDatabaseCount('roles', 10);
        $this->assertDatabaseHas('users', ['email' => 'admin@insetti.com', 'role' => 'admin', 'is_active' => true]);
        foreach (['operador', 'supervisor', 'calidad', 'laboratorio', 'mantenimiento', 'bioseguridad', 'planeacion', 'direccion', 'ti'] as $account) {
            $this->assertDatabaseHas('users', ['email' => "{$account}@insetti.com", 'is_active' => true]);
        }
    }

    public function test_operator_can_use_production_but_cannot_open_user_administration(): void
    {
        $operator = User::query()->where('email', 'operador@insetti.com')->firstOrFail();
        $operator->update(['must_change_password' => false]);
        $this->actingAs($operator);

        $this->get('/mes/control')->assertRedirect('/dashboard#/control');
        $this->get('/mes/inventory')->assertRedirect('/dashboard#/inventory');
        $this->getJson('/mes/rev031/bootstrap')->assertOk()->assertJsonPath('levels.control', 2);
        $this->get('/mes/users')->assertForbidden();
        $this->get('/mes/quality')->assertForbidden();
    }

    public function test_quality_account_is_read_only_outside_its_area(): void
    {
        $quality = User::query()->where('email', 'calidad@insetti.com')->firstOrFail();
        $quality->update(['must_change_password' => false]);
        $this->actingAs($quality);

        $this->get('/mes/quality')->assertRedirect('/dashboard#/checklist');
        $this->post('/mes/production', [])->assertForbidden();
        $this->post('/mes/quality/inspections', [])->assertSessionHasErrors();
    }

    public function test_administrator_can_create_a_user_with_role_exceptions(): void
    {
        $admin = User::query()->where('email', 'admin@insetti.com')->firstOrFail();
        $operatorRole = Role::query()->where('slug', 'operator')->firstOrFail();
        $permissions = $operatorRole->permissions()->pluck('permissions.key')->reject(fn (string $key): bool => $key === 'inventory.write')->push('quality.read')->values()->all();
        $this->actingAs($admin)->post('/mes/users', [
            'name' => 'Usuario Personalizado',
            'email' => 'personalizado@insetti.com',
            'company' => 'Insetti',
            'role_id' => $operatorRole->id,
            'password' => 'TempPass2026!',
            'password_confirmation' => 'TempPass2026!',
            'permissions' => $permissions,
            'must_change_password' => true,
        ])->assertRedirect();

        $user = User::query()->where('email', 'personalizado@insetti.com')->firstOrFail();
        $this->assertTrue($user->hasPermission('quality.read'));
        $this->assertFalse($user->hasPermission('inventory.write'));
        $this->assertTrue($user->must_change_password);
        $this->assertDatabaseHas('audit_events', ['event' => 'USER_CREATED', 'auditable_id' => (string) $user->id]);
    }

    public function test_inactive_account_cannot_authenticate(): void
    {
        $operator = User::query()->where('email', 'operador@insetti.com')->firstOrFail();
        $operator->update(['is_active' => false]);

        $this->post('/login', ['email' => $operator->email, 'password' => AccessControlSeeder::TEST_PASSWORD])
            ->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_temporary_password_account_is_sent_to_security_settings(): void
    {
        $operator = User::query()->where('email', 'operador@insetti.com')->firstOrFail();

        $this->actingAs($operator)->get('/dashboard')->assertRedirect(route('security.edit'));
    }

    public function test_last_active_administrator_cannot_be_demoted(): void
    {
        $admin = User::query()->where('email', 'admin@insetti.com')->firstOrFail();
        $operatorRole = Role::query()->where('slug', 'operator')->firstOrFail();

        $this->actingAs($admin)->patch("/mes/users/{$admin->id}", [
            'name' => $admin->name,
            'email' => $admin->email,
            'company' => $admin->company,
            'role_id' => $operatorRole->id,
            'permissions' => $operatorRole->permissions()->pluck('permissions.key')->all(),
            'is_active' => true,
            'must_change_password' => false,
        ])->assertSessionHasErrors('role_id');

        $this->assertSame('admin', $admin->fresh()->role);
    }

    public function test_roles_can_be_configured_separately_and_screen_access_is_enforced(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $operator = User::where('email', 'operador@insetti.com')->firstOrFail();
        $operator->update(['must_change_password' => false]);
        $role = Role::where('slug', 'operator')->firstOrFail();
        $this->actingAs($admin)->get('/mes/roles')->assertOk();
        $this->patch('/mes/roles/'.$role->id, [
            'name' => $role->name, 'area' => $role->area, 'description' => $role->description,
            'permissions' => $role->permissions()->pluck('permissions.key')->all(),
            'screens' => ['home', 'control'],
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->actingAs($operator)->getJson('/mes/rev031/bootstrap')->assertOk()
            ->assertJsonPath('levels.control', 2)->assertJsonPath('levels.inventory', 0);
        $this->get('/mes/inventory')->assertForbidden();
        $this->get('/mes/roles')->assertForbidden();
        $this->assertDatabaseHas('audit_events', ['event' => 'ROLE_UPDATED']);
    }

    public function test_new_account_inherits_assigned_role_without_individual_permission_payload(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $role = Role::where('slug', 'operator')->firstOrFail();
        $this->actingAs($admin)->post('/mes/users', [
            'name' => 'Cuenta de rol', 'email' => 'role-test@example.test', 'company' => 'Insetti', 'role_id' => $role->id,
            'password' => 'TempPass2026!', 'password_confirmation' => 'TempPass2026!',
        ])->assertRedirect()->assertSessionHasNoErrors();
        $user = User::where('email', 'role-test@example.test')->firstOrFail();
        $this->assertSame(0, $user->permissionOverrides()->count());
        $this->assertTrue($user->hasPermission('production.write'));
    }

    public function test_administrator_can_create_role_and_cannot_remove_recovery_access(): void
    {
        $admin = User::where('role', 'admin')->firstOrFail();
        $this->actingAs($admin)->post('/mes/roles', [
            'name' => 'Consulta de inventario', 'area' => 'Almacén', 'description' => 'Consulta de contenedores',
            'permissions' => ['dashboard.read', 'inventory.read'], 'screens' => ['home', 'containers'],
        ])->assertRedirect()->assertSessionHasNoErrors();
        $role = Role::where('name', 'Consulta de inventario')->firstOrFail();
        $this->assertSame(['dashboard.read', 'inventory.read'], $role->permissions()->orderBy('key')->pluck('key')->all());
        $this->assertSame(['home', 'containers'], app(RoleScreenAccess::class)->forRole($role->id));
        $this->patch('/mes/roles/'.$admin->role_id, [
            'name' => 'Administrador', 'area' => 'Administración', 'description' => 'Recuperación', 'permissions' => [], 'screens' => [],
        ])->assertRedirect()->assertSessionHasNoErrors();
        $this->assertTrue($admin->fresh()->hasPermission('users.manage'));
        $this->assertTrue(app(RoleScreenAccess::class)->allows($admin->fresh(), 'profiles'));
    }
}
