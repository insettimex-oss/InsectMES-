<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AccessControlSeeder extends Seeder
{
    public const TEST_PASSWORD = 'InsectMES2026!';

    public function run(): void
    {
        $modules = [
            'dashboard' => ['Resumen', ['read']],
            'planning' => ['Planeación', ['read', 'write', 'approve']],
            'production' => ['Producción', ['read', 'write', 'approve']],
            'inventory' => ['Inventario', ['read', 'write']],
            'traceability' => ['Trazabilidad', ['read', 'write']],
            'quality' => ['Calidad', ['read', 'write', 'approve']],
            'laboratory' => ['Laboratorio', ['read', 'write', 'approve']],
            'environment' => ['Ambiente', ['read', 'write', 'approve']],
            'biosecurity' => ['Bioseguridad', ['read', 'write', 'approve']],
            'performance' => ['OEE y paros', ['read', 'write']],
            'maintenance' => ['Mantenimiento', ['read', 'write', 'approve']],
            'engineering' => ['Ingeniería', ['read', 'write']],
            'governance' => ['Gobierno documental', ['read', 'write', 'approve']],
            'audit' => ['Auditoría', ['read']],
            'continuity' => ['Continuidad', ['read', 'admin']],
            'administration' => ['Configuración', ['read', 'write']],
            'costs' => ['Costos', ['read', 'write']],
            'users' => ['Usuarios y accesos', ['manage']],
        ];
        $actionNames = ['read' => 'Lectura', 'write' => 'Escritura', 'approve' => 'Aprobación', 'admin' => 'Administración', 'manage' => 'Administración'];

        foreach ($modules as $module => [$moduleName, $actions]) {
            foreach ($actions as $action) {
                Permission::query()->updateOrCreate(
                    ['key' => "{$module}.{$action}"],
                    [
                        'module' => $module,
                        'action' => $action,
                        'name' => "{$moduleName} · {$actionNames[$action]}",
                        'description' => $this->permissionDescription($moduleName, $action),
                    ],
                );
            }
        }

        $roles = [
            'admin' => ['Administrador', 'Administración', 'Acceso total, usuarios, seguridad y configuración.', ['*']],
            'operator' => ['Operador de producción', 'Producción', 'Ejecución de piso, materiales y registros operativos.', [
                'dashboard.read', 'production.read', 'production.write', 'inventory.read', 'inventory.write',
                'traceability.read', 'environment.read', 'environment.write', 'biosecurity.read', 'biosecurity.write',
            ]],
            'supervisor' => ['Supervisor de producción', 'Producción', 'Planeación diaria, liberación, ejecución y supervisión del turno.', [
                'dashboard.read', 'planning.read', 'planning.write', 'planning.approve', 'production.read', 'production.write', 'production.approve',
                'inventory.read', 'inventory.write', 'traceability.read', 'traceability.write', 'quality.read',
                'environment.read', 'environment.write', 'environment.approve', 'biosecurity.read', 'biosecurity.write', 'biosecurity.approve',
                'performance.read', 'performance.write', 'engineering.read', 'audit.read', 'costs.read',
            ]],
            'quality' => ['Calidad', 'Calidad', 'Inspección, desviaciones, cuarentena, liberación y certificados.', [
                'dashboard.read', 'quality.read', 'quality.write', 'quality.approve', 'laboratory.read',
                'traceability.read', 'inventory.read', 'production.read', 'environment.read', 'biosecurity.read',
                'governance.read', 'audit.read',
            ]],
            'laboratory' => ['Laboratorio', 'Laboratorio', 'Muestras, métodos, resultados y revisión analítica.', [
                'dashboard.read', 'quality.read', 'laboratory.read', 'laboratory.write', 'laboratory.approve',
                'traceability.read', 'inventory.read',
            ]],
            'maintenance' => ['Mantenimiento', 'Mantenimiento', 'Activos, OT, calibración, condición y repuestos.', [
                'dashboard.read', 'maintenance.read', 'maintenance.write', 'maintenance.approve',
                'performance.read', 'performance.write', 'engineering.read', 'inventory.read', 'audit.read',
            ]],
            'biosecurity' => ['Bioseguridad', 'Bioseguridad', 'Eventos sanitarios, ambiente, barreras y acciones correctivas.', [
                'dashboard.read', 'biosecurity.read', 'biosecurity.write', 'biosecurity.approve',
                'environment.read', 'environment.write', 'production.read', 'traceability.read', 'governance.read', 'audit.read',
            ]],
            'planner' => ['Planeación', 'Planeación', 'Órdenes, prioridades, rutas, capacidad y seguimiento.', [
                'dashboard.read', 'planning.read', 'planning.write', 'planning.approve', 'production.read',
                'inventory.read', 'traceability.read', 'engineering.read', 'performance.read', 'costs.read',
            ]],
            'management' => ['Dirección', 'Dirección', 'Consulta ejecutiva de operación, calidad, costos y cumplimiento.', [
                'dashboard.read', 'planning.read', 'production.read', 'inventory.read', 'traceability.read', 'quality.read',
                'laboratory.read', 'environment.read', 'biosecurity.read', 'performance.read', 'maintenance.read',
                'engineering.read', 'governance.read', 'audit.read', 'continuity.read', 'administration.read', 'costs.read',
            ]],
            'it' => ['Tecnologías de información', 'TI', 'Continuidad, parámetros, auditoría y soporte de accesos.', [
                'dashboard.read', 'audit.read', 'continuity.read', 'continuity.admin', 'administration.read',
                'administration.write', 'users.manage', 'engineering.read', 'governance.read',
            ]],
        ];

        foreach ($roles as $slug => [$name, $area, $description, $keys]) {
            $role = Role::query()->updateOrCreate(
                ['slug' => $slug],
                compact('name', 'area', 'description') + ['is_system' => true],
            );
            $permissionIds = $keys === ['*']
                ? Permission::query()->pluck('id')
                : Permission::query()->whereIn('key', $keys)->pluck('id');
            $role->permissions()->sync($permissionIds);
        }

        $accounts = [
            ['admin@insetti.com', 'Administrador Insetti', 'admin', false],
            ['operador@insetti.com', 'Operador de Prueba', 'operator', true],
            ['supervisor@insetti.com', 'Supervisor de Prueba', 'supervisor', true],
            ['calidad@insetti.com', 'Calidad de Prueba', 'quality', true],
            ['laboratorio@insetti.com', 'Laboratorio de Prueba', 'laboratory', true],
            ['mantenimiento@insetti.com', 'Mantenimiento de Prueba', 'maintenance', true],
            ['bioseguridad@insetti.com', 'Bioseguridad de Prueba', 'biosecurity', true],
            ['planeacion@insetti.com', 'Planeación de Prueba', 'planner', true],
            ['direccion@insetti.com', 'Dirección de Prueba', 'management', true],
            ['ti@insetti.com', 'TI de Prueba', 'it', true],
        ];

        foreach ($accounts as [$email, $name, $roleSlug, $mustChangePassword]) {
            $role = Role::query()->where('slug', $roleSlug)->firstOrFail();
            User::query()->updateOrCreate(
                ['email' => $email],
                [
                    'name' => $name,
                    'password' => Hash::make(self::TEST_PASSWORD),
                    'email_verified_at' => now(),
                    'role' => $roleSlug,
                    'role_id' => $role->id,
                    'company' => 'Insetti',
                    'is_active' => true,
                    'must_change_password' => $mustChangePassword,
                ],
            );
        }
    }

    private function permissionDescription(string $moduleName, string $action): string
    {
        return match ($action) {
            'read' => "Consultar información de {$moduleName}.",
            'write' => "Crear y modificar registros de {$moduleName}.",
            'approve' => "Liberar, cerrar o aprobar registros de {$moduleName}.",
            default => "Administrar {$moduleName}.",
        };
    }
}
