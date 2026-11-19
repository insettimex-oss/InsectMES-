<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class RoleScreenAccess
{
    public static function canonical(string $screen): string
    {
        return ['inventory-workflow' => 'inventory', 'egg' => 'reproduction', 'transfer' => 'rearing', 'harvest' => 'rearing', 'feeding' => 'rearing', 'bsf-flow' => 'rearing', 'production' => 'control', 'reproduction-flow' => 'reproduction', 'rearing-feeding' => 'rearing', 'pre-treatment' => 'postprocess', 'guarderia' => 'nursery', 'nursery-settings' => 'nursery', 'workcenters' => 'wcs', 'roles' => 'profiles', 'governance' => 'fase-cero', 'validation' => 'validacion', 'integrations' => 'integraciones', 'continuity' => 'continuidad', 'traceability' => 'trace', 'firmas' => 'validacion'][$screen] ?? $screen;
    }

    /** @return list<string>|null */
    public function forRole(int $id): ?array
    {
        $json = DB::table('mes_settings')->where('key', 'role.screens.'.$id)->value('value');

        return $json ? json_decode($json, true, flags: JSON_THROW_ON_ERROR) : null;
    }

    public function allows(User $user, string $screen): bool
    {
        if ($user->isAdministrator()) {
            return true;
        }
        $screens = $this->forRole((int) $user->role_id);

        return $screens === null || in_array(self::canonical($screen), $screens, true);
    }
}
