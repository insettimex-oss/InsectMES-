<?php

namespace Database\Seeders;

use App\Models\Operation;
use App\Models\Part;
use App\Models\ProductionOrder;
use App\Models\User;
use App\Models\WorkCenter;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AdvancedPlanningSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::query()->where('email', 'admin@insetti.com')->firstOrFail();

        foreach (WorkCenter::query()->get() as $workCenter) {
            $parallelCapacity = match ($workCenter->code) {
                'WC-NUR' => 60,
                'WC-REA' => 200,
                'WC-PUP' => 40,
                'WC-DAR', 'WC-LOV' => 20,
                default => 1,
            };
            $workCenter->update(['parallel_capacity' => $parallelCapacity]);
        }

        Operation::query()->update(['scheduling_mode' => 'ACTIVE']);
        Operation::query()->whereIn('code', ['NUR', 'REA', 'PUP', 'DAR', 'LOV'])->update(['scheduling_mode' => 'DWELL']);

        foreach ([
            ['WC-REA-02', 'Larvero alterno demostrativo', 160, 'REA'],
            ['WC-DRY-02', 'Deshidratador alterno demostrativo', 1, 'DRY'],
        ] as [$centerCode, $description, $parallelCapacity, $operationCode]) {
            $alternate = WorkCenter::query()->updateOrCreate(['code' => $centerCode], [
                'description' => $description,
                'status' => 'IDLE',
                'parallel_capacity' => $parallelCapacity,
                'active' => true,
            ]);
            foreach (DB::table('shifts')->where('active', true)->get() as $shift) {
                DB::table('work_center_shift_capacities')->updateOrInsert(
                    ['work_center_id' => $alternate->id, 'shift_id' => $shift->id],
                    ['available_minutes' => 480, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
                );
            }
            DB::table('operation_work_center_options')->updateOrInsert([
                'operation_id' => Operation::where('code', $operationCode)->value('id'),
                'work_center_id' => $alternate->id,
            ], [
                'priority' => 50,
                'efficiency_factor' => 1,
                'qualification_status' => 'PENDING',
                'active' => true,
                'notes' => 'Configuración demostrativa pendiente de calificación física y aprobación del responsable.',
                'approved_by' => null,
                'approved_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach ([
            ['WIP-NUR', 'PREMIUM-FEED', 'NUR'],
            ['WIP-NUR', 'MP-004', 'NUR'],
            ['WIP-NUR', 'MP-003', 'NUR'],
            ['WIP-LAR17', 'F-001', 'REA'],
        ] as [$parent, $component, $operation]) {
            DB::table('bom_lines')
                ->where('parent_part_id', Part::where('code', $parent)->value('id'))
                ->where('component_part_id', Part::where('code', $component)->value('id'))
                ->update(['operation_id' => Operation::where('code', $operation)->value('id'), 'updated_at' => now()]);
        }

        foreach ([
            ['CMP-LARVA-2026', 'Larva fresca 2026', 'LARVA_FRESCA', 'BSF005', 10],
            ['CMP-HARINA-2026', 'Harina BSF 2026', 'HARINA_BSF', 'FG-BOX', 20],
        ] as [$code, $name, $family, $part, $priority]) {
            DB::table('production_campaigns')->updateOrInsert(['code' => $code], [
                'name' => $name,
                'family' => $family,
                'part_id' => Part::where('code', $part)->value('id'),
                'priority' => $priority,
                'planned_start' => now()->startOfDay(),
                'planned_end' => now()->addMonths(3)->endOfDay(),
                'status' => 'ACTIVE',
                'active' => true,
                'notes' => 'Campaña demostrativa; validar fechas y familia antes del piloto.',
                'created_by' => $user->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('work_center_changeover_rules')->updateOrInsert([
            'work_center_id' => WorkCenter::where('code', 'WC-PAC')->value('id'),
            'from_family' => 'LARVA_FRESCA',
            'to_family' => 'HARINA_BSF',
        ], [
            'setup_minutes' => 45,
            'cleaning_required' => true,
            'active' => true,
            'notes' => 'Limpieza sanitaria y liberación de línea antes del empaque.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        ProductionOrder::query()->where('number', 'OP-DEMO-001')->update([
            'campaign_id' => DB::table('production_campaigns')->where('code', 'CMP-LARVA-2026')->value('id'),
        ]);

        foreach ([
            ['BSF005', 'TRA', 120, 132, 168, 'Transferir después de completar la ventana de guardería.'],
            ['BSF005', 'REA', 120, 144, 168, 'Iniciar engorda dentro de la ventana de edad de la larva.'],
            ['BSF005', 'HAR', 408, 432, 480, 'Cosechar dentro de la ventana objetivo de bioconversión.'],
            ['BSF002', 'DAR', 168, 192, 240, 'Mover a jaula oscura después de la pupación.'],
            ['BSF002', 'LOV', 528, 552, 600, 'Ingresar a reproducción dentro de la ventana adulta aprobada.'],
        ] as [$part, $operation, $minimum, $target, $maximum, $rationale]) {
            DB::table('biological_planning_rules')->updateOrInsert([
                'part_id' => Part::where('code', $part)->value('id'),
                'operation_id' => Operation::where('code', $operation)->value('id'),
            ], [
                'minimum_age_hours' => $minimum,
                'target_age_hours' => $target,
                'maximum_age_hours' => $maximum,
                'active' => true,
                'rationale' => $rationale.' Valores demostrativos sujetos a validación del proceso.',
                'approved_by' => $user->id,
                'approved_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        DB::table('material_supply_events')->updateOrInsert([
            'part_id' => Part::where('code', 'F-001')->value('id'),
            'reference' => 'OC-DEMO-001',
        ], [
            'quantity' => 500,
            'unit' => 'kg',
            'available_at' => now()->addDays(7)->startOfDay()->addHours(8),
            'status' => 'PLANNED',
            'source' => 'Orden de compra demostrativa',
            'notes' => 'No participa en el plan hasta ser confirmada.',
            'created_by' => $user->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
