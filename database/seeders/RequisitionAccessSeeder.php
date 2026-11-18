<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class RequisitionAccessSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['read' => 'Consultar requisiciones', 'write' => 'Solicitar y editar compras', 'approve' => 'Marcar partidas como compradas'] as $action => $name) {
            Permission::updateOrCreate(['key' => 'requisitions.'.$action], ['module' => 'requisitions', 'action' => $action, 'name' => $name, 'description' => $name]);
        }
        $staff = Permission::whereIn('key', ['requisitions.read', 'requisitions.write'])->pluck('id')->all();
        foreach (Role::all() as $role) {
            $role->permissions()->syncWithoutDetaching($role->slug === 'admin' ? Permission::where('module', 'requisitions')->pluck('id')->all() : $staff);
        }
    }
}
