<?php

namespace App\Services;

use App\Models\User;

class MesAuthorization
{
    /** @var array<string, string> */
    private const SECTION_PERMISSIONS = [
        'parts' => 'engineering.read',
        'locations' => 'engineering.read',
        'operations' => 'engineering.read',
        'routing' => 'engineering.read',
        'bom' => 'engineering.read',
        'orders' => 'planning.read',
        'control' => 'production.read',
        'nursery' => 'production.read',
        'feeding' => 'production.read',
        'inventory' => 'inventory.read',
        'logistics' => 'logistics.read',
        'trace' => 'traceability.read',
        'quality' => 'quality.read',
        'environment' => 'environment.read',
        'biosecurity' => 'biosecurity.read',
        'mass-balance' => 'production.read',
        'performance' => 'performance.read',
        'maintenance' => 'maintenance.read',
        'audit' => 'audit.read',
        'continuity' => 'continuity.read',
        'governance' => 'governance.read',
        'validation' => 'validation.read',
        'integrations' => 'integrations.read',
        'parameters' => 'administration.read',
        'costs' => 'costs.read',
        'users' => 'users.manage',
    ];

    public function permissionForSection(string $section): ?string
    {
        return self::SECTION_PERMISSIONS[$section] ?? null;
    }

    public function authorizeSection(User $user, string $section): void
    {
        $permission = $this->permissionForSection($section);
        if ($permission === null) {
            abort(404);
        }
        abort_unless($user->hasPermission($permission), 403, 'Su rol no tiene acceso a este módulo.');
    }
}
