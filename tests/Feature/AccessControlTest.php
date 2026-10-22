<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
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

        $this->get('/mes/control')->assertOk();
        $this->get('/mes/inventory')->assertOk();
        $this->get('/mes/users')->assertForbidden();
        $this->get('/mes/quality')->assertForbidden();
    }

    public function test_quality_account_is_read_only_outside_its_area(): void
    {
        $quality = User::query()->where('email', 'calidad@insetti.com')->firstOrFail();
        $quality->update(['must_change_password' => false]);
        $this->actingAs($quality);

        $this->get('/mes/quality')->assertOk();
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
}
