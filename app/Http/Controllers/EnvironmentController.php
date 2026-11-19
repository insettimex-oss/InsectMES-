<?php

namespace App\Http\Controllers;

use App\Services\EnvironmentSwitch;
use Illuminate\Http\Request;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Process;

class EnvironmentController
{
    public function begin(Request $request, EnvironmentSwitch $switch): RedirectResponse
    {
        $switch->enabled($request);
        $data = $request->validate(['return' => ['required', 'string', 'max:3000']]);
        $flow = $switch->begin($data['return']);

        return redirect()->away($flow['authorize'])->withCookie(cookie('mes_environment_binding_'.substr($flow['state'], 0, 16), $flow['binding'], 2, '/', null, false, true, false, 'lax'))
            ->header('Cache-Control', 'no-store')->header('Referrer-Policy', 'no-referrer');
    }

    public function authorize(Request $request, EnvironmentSwitch $switch): RedirectResponse
    {
        $switch->enabled($request);
        $data = $request->validate(['state' => ['required', 'string', 'size:64']]);

        return redirect()->away($switch->authorize($data['state'], $request->user()))
            ->header('Cache-Control', 'no-store')->header('Referrer-Policy', 'no-referrer');
    }

    public function accept(Request $request, EnvironmentSwitch $switch): RedirectResponse
    {
        $switch->enabled($request);
        $data = $request->validate(['state' => ['required', 'string', 'size:64'], 'ticket' => ['required', 'string', 'size:64']]);
        $cookieName = 'mes_environment_binding_'.substr($data['state'], 0, 16);
        $binding = $request->cookie($cookieName);
        abort_unless(is_string($binding), 403, 'Abre el cambio de entorno desde Configuración.');
        $flow = $switch->accept($data['state'], $data['ticket'], $binding, $request->user());
        Auth::login($flow['user']);
        $request->session()->regenerate();

        return redirect($flow['return'])->withoutCookie($cookieName)
            ->header('Cache-Control', 'no-store')->header('Referrer-Policy', 'no-referrer');
    }

    public function refresh(Request $request, EnvironmentSwitch $switch): JsonResponse
    {
        $switch->enabled($request);
        abort_unless($switch->realm() === 'primary' && $request->user()->isAdministrator(), 403);
        $result = Process::path(base_path())->timeout(65)->run([PHP_BINARY, base_path('scripts/refresh-sandbox.php')]);
        abort_unless($result->successful(), 503, 'No se pudo actualizar Sandbox. Se conservaron las bases; revisa el registro local.');

        $status = file_get_contents(base_path('.local/sandbox/status.json'));
        abort_if($status === false, 503, 'La copia terminó, pero no se pudo leer su estado.');
        return response()->json(['message' => 'Sandbox actualizado. Se conservó la copia anterior.', 'refreshedAt' => json_decode($status, true, flags: JSON_THROW_ON_ERROR)['refreshedAt']]);
    }
}
