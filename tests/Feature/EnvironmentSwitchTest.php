<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\EnvironmentSwitch;
use Database\Seeders\AccessControlSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\TestCase;

class EnvironmentSwitchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(AccessControlSeeder::class);
        config(['environment-switch.directory' => storage_path('framework/testing/switch-'.bin2hex(random_bytes(8)))]);
    }

    private function flow(): array
    {
        $this->app['env'] = 'sandbox';
        $service = app(EnvironmentSwitch::class);
        $flow = $service->begin('/dashboard#/inventory');
        $this->app['env'] = 'local';
        $user = User::where('email', 'operador@insetti.com')->firstOrFail();
        $user->update(['must_change_password' => false]);
        $url = $service->authorize($flow['state'], $user);
        parse_str(parse_url($url, PHP_URL_QUERY), $params);
        $this->app['env'] = 'sandbox';

        return [$service, $flow, $params, $user];
    }

    public function test_switch_uses_target_user_and_consumes_ticket_once(): void
    {
        [$service, $flow, $params, $user] = $this->flow();
        $result = $service->accept($flow['state'], $params['ticket'], $flow['binding'], null);
        $this->assertSame($user->id, $result['user']->id);
        $this->assertFalse($result['user']->isAdministrator());
        $this->assertSame('/dashboard#/inventory', $result['return']);
        $this->expectException(HttpException::class);
        $service->accept($flow['state'], $params['ticket'], $flow['binding'], null);
    }

    public function test_ticket_cannot_log_in_another_browser(): void
    {
        [$service, $flow, $params] = $this->flow();
        $this->expectException(HttpException::class);
        $service->accept($flow['state'], $params['ticket'], 'another-browser', null);
    }

    public function test_inactive_target_account_is_rejected(): void
    {
        [$service, $flow, $params, $user] = $this->flow();
        $user->update(['is_active' => false]);
        $this->expectException(HttpException::class);
        $service->accept($flow['state'], $params['ticket'], $flow['binding'], null);
    }

    public function test_expired_flow_is_rejected(): void
    {
        config(['environment-switch.ttl' => -1]);
        $service = app(EnvironmentSwitch::class);
        $flow = $service->begin('/dashboard');
        $this->expectException(HttpException::class);
        $service->authorize($flow['state'], User::where('email', 'admin@insetti.com')->firstOrFail());
    }

    public function test_external_redirect_is_rejected(): void
    {
        $this->expectException(HttpException::class);
        app(EnvironmentSwitch::class)->begin('//example.com');
    }

    public function test_authorization_requires_a_session_and_manual_refresh_requires_admin(): void
    {
        config(['environment-switch.enabled' => true]);
        $this->get('/mes/environment/authorize?state='.str_repeat('a', 64))->assertRedirect('/login');
        $user = User::where('email', 'operador@insetti.com')->firstOrFail();
        $user->update(['must_change_password' => false]);
        $this->actingAs($user)->postJson('/mes/environment/refresh')->assertForbidden();
    }
}
