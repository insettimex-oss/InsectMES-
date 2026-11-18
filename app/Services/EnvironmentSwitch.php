<?php

namespace App\Services;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;

class EnvironmentSwitch
{
    public function realm(): string
    {
        return app()->environment('sandbox') ? 'sandbox' : 'primary';
    }

    public function url(string $realm): string
    {
        return rtrim((string) config('environment-switch.'.$realm.'_url'), '/');
    }

    public function enabled(Request $request): void
    {
        abort_unless(config('environment-switch.enabled') && in_array($request->ip(), ['127.0.0.1', '::1'], true), 403, 'El cambio local de entorno no está habilitado.');
    }

    public function returnPath(string $path): string
    {
        abort_unless(strlen($path) <= 3000 && ! preg_match('/[\x00-\x20\\\\]/', $path)
            && preg_match('~^/(dashboard|mes(?:/[^?#]+)?|settings(?:/[^?#]+)?)(?:[?#].*)?$~D', $path), 422, 'La pantalla de destino no es válida.');

        return $path;
    }

    /** @return array{state:string,binding:string,authorize:string} */
    public function begin(string $return): array
    {
        $state = bin2hex(random_bytes(32));
        $binding = bin2hex(random_bytes(32));
        $target = $this->realm();
        $source = $target === 'sandbox' ? 'primary' : 'sandbox';
        $record = ['source' => $source, 'target' => $target, 'return' => $this->returnPath($return),
            'binding' => hash('sha256', $binding), 'expires' => time() + (int) config('environment-switch.ttl'), 'status' => 'pending'];
        $directory = (string) config('environment-switch.directory');
        if (! is_dir($directory)) mkdir($directory, 0700, true);
        $file = fopen($directory.'/'.hash('sha256', $state).'.json', 'x');
        abort_unless($file !== false, 503);
        fwrite($file, json_encode($record, JSON_THROW_ON_ERROR));
        fclose($file);

        return ['state' => $state, 'binding' => $binding, 'authorize' => $this->url($source).'/mes/environment/authorize?'.http_build_query(['state' => $state])];
    }

    public function authorize(string $state, User $user): string
    {
        return $this->transaction($state, function (array &$record) use ($state, $user): string {
            abort_unless($record['status'] === 'pending' && $record['source'] === $this->realm(), 403);
            abort_unless($user->is_active && $user->hasVerifiedEmail() && ! $user->must_change_password, 403);
            $ticket = bin2hex(random_bytes(32));
            $record['status'] = 'authorized';
            $record['ticket'] = hash('sha256', $ticket);
            $record['user'] = ['id' => $user->id, 'email' => $user->email, 'proof' => $this->proof($user)];

            return $this->url($record['target']).'/mes/environment/accept?'.http_build_query(['state' => $state, 'ticket' => $ticket]);
        });
    }

    /** @return array{user:User,return:string} */
    public function accept(string $state, string $ticket, string $binding, ?User $current): array
    {
        return $this->transaction($state, function (array &$record) use ($ticket, $binding, $current): array {
            abort_unless($record['status'] === 'authorized' && $record['target'] === $this->realm()
                && hash_equals($record['ticket'], hash('sha256', $ticket)) && hash_equals($record['binding'], hash('sha256', $binding)), 403, 'El cambio de entorno caducó. Ábrelo otra vez desde Configuración.');
            $user = User::query()->where('id', $record['user']['id'])->first();
            abort_unless($user && $user->email === $record['user']['email'] && $user->is_active && $user->hasVerifiedEmail() && ! $user->must_change_password, 403, 'La cuenta no está disponible en el entorno de destino.');
            // Sandbox roles never grant privileges in primary. Its own user record is authoritative.
            if ($record['target'] === 'primary' && ! ($current?->id === $user->id && $current->is_active)) {
                abort_unless(hash_equals($this->proof($user), $record['user']['proof']), 403, 'La identidad cambió en Sandbox. Inicia sesión en el principal para continuar.');
            }
            $record['status'] = 'consumed';
            unset($record['ticket'], $record['binding'], $record['user']);

            return ['user' => $user, 'return' => $this->returnPath($record['return'])];
        });
    }

    private function proof(User $user): string
    {
        return hash_hmac('sha256', $user->getAuthPassword(), (string) config('app.key'));
    }

    private function transaction(string $state, Closure $callback): mixed
    {
        abort_unless((bool) preg_match('/^[a-f0-9]{64}$/D', $state), 403);
        $path = config('environment-switch.directory').'/'.hash('sha256', $state).'.json';
        abort_unless(is_file($path), 403, 'El cambio de entorno ya no está disponible.');
        $file = fopen($path, 'r+');
        abort_unless($file !== false && flock($file, LOCK_EX), 503);
        try {
            $record = json_decode(stream_get_contents($file), true, flags: JSON_THROW_ON_ERROR);
            abort_unless(($record['expires'] ?? 0) >= time(), 403, 'El cambio de entorno caducó.');
            $result = $callback($record);
            rewind($file);
            ftruncate($file, 0);
            fwrite($file, json_encode($record, JSON_THROW_ON_ERROR));

            return $result;
        } finally {
            flock($file, LOCK_UN);
            fclose($file);
        }
    }
}
