<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class Rev031WorkspaceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->withoutVite();
        $this->actingAs(User::where('email', 'admin@insetti.com')->firstOrFail());
    }

    private function payload(): array
    {
        $boot = $this->getJson('/mes/rev031/bootstrap')->assertOk()->json();

        return ['revision' => $boot['revision'], 'fingerprint' => $boot['fingerprint'], 'state' => $boot['state'], 'screen' => 'inventory'];
    }

    public function test_main_application_is_rev031_and_native_exceptions_remain(): void
    {
        $this->get('/dashboard')->assertOk()->assertInertia(fn ($page) => $page->component('mes/rev031'));
        foreach (['governance', 'validation', 'integrations', 'audit', 'continuity', 'users'] as $section) {
            $this->get('/mes/'.$section)->assertOk()->assertInertia(fn ($page) => $page->component('mes/section'));
        }
        foreach (['parts', 'inventory', 'control', 'feeding', 'orders', 'costs'] as $section) {
            $this->get('/mes/'.$section)->assertRedirect();
        }
    }

    public function test_bootstrap_requires_authentication_and_never_contains_passwords(): void
    {
        $boot = $this->getJson('/mes/rev031/bootstrap')->assertOk();
        $this->assertArrayNotHasKey('password', $boot->json('security.users.0'));
        $this->assertArrayNotHasKey('hash', $boot->json('security.users.0'));
        $this->app['auth']->forgetGuards();
        $this->getJson('/mes/rev031/bootstrap')->assertUnauthorized();
    }

    public function test_native_inventory_survives_first_commit_and_reload(): void
    {
        $before = Container::orderBy('id')->get(['serial', 'quantity_current'])->toArray();
        $payload = $this->payload();
        $payload['state']['loadedSources'] = ['WC-REA' => ['tray:QA' => ['serial' => 'QA']]];
        $payload['state']['nursery'] = ['entries' => [], 'events' => []];
        $payload['state']['labels30'] = ['templates' => [], 'assignments' => []];
        $this->postJson('/mes/rev031/state', $payload)->assertOk()->assertJsonPath('revision', 1);
        $this->assertSame($before, Container::orderBy('id')->get(['serial', 'quantity_current'])->toArray());
        $this->assertSame(count($before), count($this->payload()['state']['serials']));
        $this->assertSame($payload['state']['loadedSources'], $this->payload()['state']['loadedSources']);
        $this->assertSame($payload['state']['nursery'], $this->payload()['state']['nursery']);
        $this->assertSame($payload['state']['labels30'], $this->payload()['state']['labels30']);
        $this->assertDatabaseHas('audit_events', ['event' => 'REV031_SAVED']);
    }

    public function test_concurrent_stale_save_is_rejected_atomically(): void
    {
        $payload = $this->payload();
        $this->postJson('/mes/rev031/state', $payload)->assertOk();
        $payload['state']['serials'][0]['qtyCurrent'] = 999;
        $this->postJson('/mes/rev031/state', $payload)->assertConflict();
        $this->assertNotEquals(999, Container::first()->quantity_current);
    }

    public function test_negative_stock_unknown_references_and_deleted_serials_are_rejected(): void
    {
        $payload = $this->payload();
        $payload['state']['serials'][0]['qtyCurrent'] = -1;
        $this->postJson('/mes/rev031/state', $payload)->assertUnprocessable();
        $payload = $this->payload();
        $payload['state']['serials'][0]['part'] = 'DOES-NOT-EXIST';
        $this->postJson('/mes/rev031/state', $payload)->assertUnprocessable();
        $payload = $this->payload();
        array_pop($payload['state']['serials']);
        $this->postJson('/mes/rev031/state', $payload)->assertUnprocessable();
        $this->assertDatabaseMissing('mes_settings', ['key' => 'rev031.workspace']);
    }

    public function test_held_quarantined_or_unfinalized_stock_cannot_be_consumed(): void
    {
        foreach ([['status' => 'HOLD'], ['quarantined' => true], ['status' => 'RECIBO']] as $changes) {
            Container::first()->update($changes + ['quantity_current' => 10]);
            $payload = $this->payload();
            $payload['state']['serials'][0]['qtyCurrent'] = 5;
            $this->postJson('/mes/rev031/state', $payload)->assertUnprocessable();
            Container::first()->update(['status' => 'OK', 'quarantined' => false]);
        }
    }

    public function test_operator_cannot_change_setup_or_native_accounts(): void
    {
        $operator = User::where('email', 'operador@insetti.com')->firstOrFail();
        $operator->update(['must_change_password' => false]);
        $this->actingAs($operator);
        $payload = $this->payload();
        $payload['state']['setupTables']['Container_Status'][0]['allowProduction'] = true;
        $payload['state']['setupTables']['Container_Status'][0]['description'] = 'Unauthorized';
        $this->postJson('/mes/rev031/state', $payload)->assertForbidden();
        $this->get('/mes/users')->assertForbidden();
    }

    public function test_native_changes_after_bootstrap_cannot_be_overwritten(): void
    {
        $payload = $this->payload();
        Container::first()->update(['quantity_current' => 17]);
        $this->postJson('/mes/rev031/state', $payload)->assertConflict();
        $this->assertSame(17.0, Container::first()->quantity_current);
    }

    public function test_no_demo_inventory_or_active_external_integration_is_created(): void
    {
        $count = Container::count();
        $this->getJson('/mes/rev031/bootstrap')->assertOk();
        $this->assertSame($count, Container::count());
        $this->assertSame(0, DB::table('integration_endpoints')->where('active', true)->where('transport', 'HTTP')->count());
    }

    public function test_parameters_use_rev031_process_and_origin_without_overwriting_numeric_values(): void
    {
        DB::table('parameters')->where('code', 'TRA_TARGET')->update(['value' => 12345]);
        $state = $this->getJson('/mes/rev031/bootstrap')->assertOk()->json('state');
        $parameter = collect($state['parameters'])->firstWhere('code', 'TRA_TARGET');
        $this->assertSame('TRA', $parameter['operation']);
        $this->assertSame('Alejandro · 11 Nov 2026', $parameter['source']);
        $this->assertEquals(12345, $parameter['value']);
        $this->assertSame('', $parameter['part']);
        $this->assertSame('', $parameter['workcenter']);
    }

    public function test_duplicate_unit_code_is_rejected_without_saving_workspace(): void
    {
        $payload = $this->payload();
        $payload['screen'] = 'units';
        $unit = $payload['state']['units'][0];
        $unit['code'] = strtoupper($unit['code']);
        $payload['state']['units'][] = $unit;

        $this->postJson('/mes/rev031/state', $payload)->assertUnprocessable()->assertJsonValidationErrors('units.0.code');
        $this->assertDatabaseMissing('mes_settings', ['key' => 'rev031.workspace']);
    }

    public function test_role_screen_restriction_rejects_direct_save_even_with_module_write_permission(): void
    {
        $operator = User::where('email', 'operador@insetti.com')->firstOrFail();
        $operator->update(['must_change_password' => false]);
        DB::table('mes_settings')->insert(['key' => 'role.screens.'.$operator->role_id, 'value' => json_encode(['home', 'control']), 'created_at' => now(), 'updated_at' => now()]);
        $this->actingAs($operator);
        $payload = $this->payload();
        $payload['state']['serials'][0]['qtyCurrent'] += 1;
        $this->postJson('/mes/rev031/state', $payload)->assertForbidden();
        $this->assertDatabaseMissing('mes_settings', ['key' => 'rev031.workspace']);
    }
}
