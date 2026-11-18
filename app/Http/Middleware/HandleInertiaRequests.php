<?php

namespace App\Http\Middleware;

use App\Http\Controllers\Rev031WorkspaceController;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'workspaceBootstrap' => fn () => $user && $request->is('dashboard', 'mes/*', 'settings/*')
                && (! $request->is('settings/*') || $user->hasPermission('dashboard.read'))
                ? app(Rev031WorkspaceController::class)->bootstrap($request)->getData(true) : null,
            'auth' => [
                'user' => $user ? [
                    ...$user->toArray(),
                    'role_name' => $user->roleName(),
                    'role_slug' => $user->roleSlug(),
                    'permissions' => $user->effectivePermissionKeys(),
                ] : null,
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
