<?php

namespace Database\Seeders;

use App\Models\Container;
use App\Models\Location;
use App\Models\NurseryBatch;
use App\Models\Operation;
use App\Models\Parameter;
use App\Models\Part;
use App\Models\ProductionOrder;
use App\Models\User;
use App\Models\WorkCenter;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $user = User::query()->updateOrCreate(
            ['email' => 'admin@insetti.com'],
            ['name' => 'Administrador Insetti', 'password' => Hash::make('InsectMES2026!'), 'email_verified_at' => now(), 'role' => 'admin', 'company' => 'Insetti'],
        );

        $parts = [
            ['BSF001', 'Mosca adulta', 'pc', 'WIP'], ['BSF002', 'Huevos BSF', 'g', 'WIP'],
            ['WIP-NUR', 'Huevos en guardería', 'g', 'WIP'], ['BSF004', 'Larva 5-DOL', 'g', 'WIP'],
            ['WIP-LAR', 'Larvero', 'kg', 'WIP'], ['WIP-LAR17', 'Larvero 17-DOL', 'kg', 'WIP'],
            ['BSF005', 'Larva 17-DOL', 'kg', 'WIP'], ['BSF006', 'Pupas', 'pc', 'WIP'],
            ['SB001', 'Larva deshidratada', 'g', 'WIP'], ['SB-FLA', 'Flake Larvae', 'g', 'WIP'],
            ['FG-MEAL', 'BSFL Meal', 'kg', 'Producto Terminado'], ['FG001', 'Producto empacado', 'pc', 'Producto Terminado'],
            ['FG-BOX', 'Caja de producto', 'pc', 'Producto Terminado'], ['PREMIUM-FEED', 'Premium Feed', 'g', 'Materia Prima'],
            ['F-001', 'Alimento de engorda', 'kg', 'Materia Prima'], ['MP-003', 'Salvado', 'g', 'Materia Prima'],
            ['MP-004', 'Agua', 'ml', 'Materia Prima'], ['FRASS-A', 'Frass A', 'kg', 'Coproducto'],
            ['FRASS-B', 'Frass B', 'kg', 'Coproducto'], ['OIL-CRUDE', 'Aceite crudo', 'g', 'Coproducto'],
        ];
        foreach ($parts as [$code, $description, $unit, $type]) {
            Part::query()->updateOrCreate(['code' => $code], compact('description', 'unit', 'type') + ['serial_prefix' => 'BSF', 'active' => true]);
        }

        $locations = [
            ['ALM-MP', 'Almacén de materia prima', 'Almacén'], ['ALM-PT', 'Almacén de producto terminado', 'Almacén'],
            ['WC-EGG', 'Mesa de recolección', 'Workcenter'], ['WC-NUR', 'Rack de guardería', 'Workcenter'],
            ['WC-TRA', 'Transferencia', 'Workcenter'], ['WC-REA', 'Larvero', 'Workcenter'],
            ['WC-HAR', 'Tamizadora', 'Workcenter'], ['WC-WAS', 'Enjuague', 'Workcenter'],
            ['WC-SAN', 'Neutralizado', 'Workcenter'], ['WC-DRY', 'Microondas', 'Workcenter'],
            ['WC-FRA', 'Fraccionadora', 'Workcenter'], ['WC-GRI', 'Molino', 'Workcenter'],
            ['WC-PAC', 'Mesa de empaque', 'Workcenter'], ['WC-BOX', 'Mesa de embalaje', 'Workcenter'],
            ['WC-SHP', 'Despacho', 'Workcenter'], ['WC-PUP', 'Pupario', 'Workcenter'],
            ['WC-DAR', 'Jaula oscura', 'Workcenter'], ['WC-LOV', 'Jaula de reproducción', 'Workcenter'],
        ];
        foreach ($locations as [$code, $description, $type]) {
            Location::query()->updateOrCreate(['code' => $code], compact('description', 'type') + ['active' => true]);
            if (str_starts_with($code, 'WC-')) {
                WorkCenter::query()->updateOrCreate(['code' => $code], compact('description') + ['status' => $code === 'WC-EGG' ? 'PRODUCTION' : 'IDLE', 'active' => true]);
            }
        }
        for ($level = 0; $level <= 5; $level++) {
            Location::query()->updateOrCreate(['code' => "RACK-01-N{$level}"], ['description' => "Rack de guardería 01 / N{$level}", 'type' => 'Workcenter', 'active' => true]);
        }

        $flow = [
            ['EGG', 'Cosecha de huevos', 'Reproducción', null, 'BSF002', 'WC-EGG', 0],
            ['NUR', 'Guardería', 'Reproducción', 'BSF002', 'BSF004', 'WC-NUR', 120],
            ['TRA', 'Transferencia', 'Bioconversión', 'BSF004', 'WIP-LAR', 'WC-TRA', 0],
            ['REA', 'Engorda', 'Bioconversión', 'WIP-LAR', 'WIP-LAR17', 'WC-REA', 288],
            ['HAR', 'Tamizado / Cosecha', 'Bioconversión', 'WIP-LAR17', 'BSF005', 'WC-HAR', 0],
            ['WAS', 'Enjuague', 'Post-Proceso', 'BSF005', 'BSF005', 'WC-WAS', null],
            ['SAN', 'Neutralizado', 'Post-Proceso', 'BSF005', 'BSF005', 'WC-SAN', null],
            ['DRY', 'Deshidratado', 'Post-Proceso', 'BSF005', 'SB001', 'WC-DRY', null],
            ['FRA', 'Fraccionado', 'Post-Proceso', 'SB001', 'SB-FLA', 'WC-FRA', null],
            ['GRI', 'Molienda', 'Post-Proceso', 'SB-FLA', 'FG-MEAL', 'WC-GRI', null],
            ['PAC', 'Empaque', 'Post-Proceso', 'FG-MEAL', 'FG001', 'WC-PAC', null],
            ['BOX', 'Embalaje', 'Post-Proceso', 'FG001', 'FG-BOX', 'WC-BOX', null],
            ['SHP', 'Embarque', 'Post-Proceso', 'FG-BOX', 'FG-BOX', 'WC-SHP', null],
            ['PUP', 'Pupación', 'Reproducción', 'BSF005', 'BSF006', 'WC-PUP', 168],
            ['DAR', 'Jaula oscura', 'Reproducción', 'BSF006', 'BSF001', 'WC-DAR', 360],
            ['LOV', 'Reproducción', 'Reproducción', 'BSF001', 'BSF002', 'WC-LOV', 120],
        ];
        foreach ($flow as $index => [$code, $name, $area, $input, $output, $workCenter, $duration]) {
            Operation::query()->updateOrCreate(['code' => $code], [
                'name' => $name, 'area' => $area,
                'work_center_id' => WorkCenter::where('code', $workCenter)->value('id'),
                'input_part_id' => $input ? Part::where('code', $input)->value('id') : null,
                'output_part_id' => Part::where('code', $output)->value('id'),
                'duration_hours' => $duration, 'sort_order' => ($index + 1) * 10, 'active' => true,
            ]);
        }

        $routeMap = [
            'BSF005' => ['EGG', 'NUR', 'TRA', 'REA', 'HAR'],
            'FG-BOX' => ['WAS', 'SAN', 'DRY', 'FRA', 'GRI', 'PAC', 'BOX', 'SHP'],
            'BSF002' => ['PUP', 'DAR', 'LOV'],
        ];
        foreach ($routeMap as $partCode => $operationCodes) {
            $routeTarget = Part::where('code', $partCode)->firstOrFail();
            DB::table('process_routes')->where('part_id', $routeTarget->id)->delete();
            foreach ($operationCodes as $index => $operationCode) {
                DB::table('process_routes')->insert([
                    'part_id' => $routeTarget->id,
                    'operation_id' => Operation::where('code', $operationCode)->value('id'),
                    'sequence' => ($index + 1) * 10,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
        $routePart = Part::where('code', 'BSF005')->firstOrFail();
        foreach ([['WIP-NUR', 'PREMIUM-FEED', 0.48, 'kg'], ['WIP-NUR', 'MP-004', 1.12, 'l'], ['WIP-NUR', 'MP-003', 0.15, 'kg'], ['WIP-LAR17', 'F-001', 4, 'kg']] as [$parent, $component, $quantity, $unit]) {
            DB::table('bom_lines')->updateOrInsert(
                ['parent_part_id' => Part::where('code', $parent)->value('id'), 'component_part_id' => Part::where('code', $component)->value('id')],
                ['quantity_per_unit' => $quantity, 'unit' => $unit, 'active' => true, 'created_at' => now(), 'updated_at' => now()],
            );
        }

        $parameterRows = [
            ['TRA_TARGET', 'Larvas por larvero', 12000, 'larvas/larvero', 'TRA', 'Usuario'],
            ['TRA_SAMPLE', 'Tamaño de muestra', 2, 'g', 'TRA', 'INS020-Transferencia'],
            ['LABOR', 'Costo de mano de obra', 65.51106771, 'MXN/h', 'COST', 'MO!G2'],
            ['EGG_YIELD', 'Larva producida por gramo de huevo', 4.32, 'kg/g', 'COST', 'Process Routing'],
            ['TRAY_KG', 'Larva por bandeja', 3, 'kg/bandeja', 'COST', 'Process Routing'],
            ['FEED_KG', 'Alimento por bandeja', 12, 'kg/bandeja', 'COST', 'Process Routing'],
            ['PREMIUM_RATIO', 'Alimento premium por kg de larva', 0.05974, 'kg/kg', 'COST', 'Process Routing'],
            ['PREMIUM_COST', 'Costo del alimento premium', 5.11902214, 'MXN/kg', 'COST', 'MP'],
            ['FEED_COST', 'Costo del alimento de engorda', 3.16727214, 'MXN/kg', 'COST', 'MP'],
            ['RATE_EGG', 'Ritmo de cosecha de huevos', 20, 'g/h', 'COST', 'Process Routing'],
            ['RATE_NUR', 'Ritmo de guardería', 40, 'g/h', 'COST', 'Process Routing'],
            ['RATE_TRA', 'Ritmo de transferencia', 10, 'bandejas/h', 'COST', 'Process Routing'],
            ['RATE_REA', 'Ritmo de engorda', 30, 'bandejas/h', 'COST', 'Process Routing'],
            ['GIF_NUR', 'Indirectos de reproducción y guardería', 12.17177849, 'MXN/kg', 'COST', 'GIF'],
        ];
        foreach ($parameterRows as [$code, $description, $value, $unit, $scope, $source]) {
            Parameter::query()->updateOrCreate(['code' => $code], compact('description', 'value', 'unit', 'scope', 'source') + ['editable' => true]);
        }

        $warehouse = Location::where('code', 'ALM-MP')->firstOrFail();
        foreach ([
            ['BSF000101', 'PREMIUM-FEED', 15000, 'g', 'SUP-2026-10'], ['BSF000102', 'MP-004', 50000, 'ml', 'AGUA-2026-10'],
            ['BSF000103', 'MP-003', 18000, 'g', 'SAL-2026-10'], ['BSF000104', 'F-001', 850, 'kg', 'ALI-2026-10'],
        ] as [$serial, $part, $quantity, $unit, $supplierLot]) {
            Container::query()->updateOrCreate(['serial' => $serial], [
                'part_id' => Part::where('code', $part)->value('id'), 'location_id' => $warehouse->id,
                'status' => 'OK', 'origin' => 'RECEIPT', 'supplier_lot' => $supplierLot,
                'lot_code' => $supplierLot, 'life_stage' => 'MATERIA_PRIMA',
                'quantity_current' => $quantity, 'unit' => $unit, 'active' => true, 'quarantined' => false,
            ]);
        }

        $eggContainer = Container::query()->updateOrCreate(['serial' => 'BSF000105'], [
            'part_id' => Part::where('code', 'BSF002')->value('id'), 'location_id' => Location::where('code', 'WC-EGG')->value('id'),
            'status' => 'OK', 'origin' => 'PRODUCTION', 'production_lot' => now()->toDateString(),
            'lot_code' => 'HUE-'.now()->format('Ymd'), 'life_stage' => 'HUEVO', 'parent_colony' => 'COL-01',
            'quantity_current' => 120, 'unit' => 'g', 'active' => true, 'quarantined' => false,
        ]);
        DB::table('production_runs')->updateOrInsert(['output_container_id' => $eggContainer->id], [
            'operation_id' => Operation::where('code', 'EGG')->value('id'), 'quantity_out' => 120, 'unit' => 'g',
            'fields' => json_encode(['cage1' => 40, 'cage2' => 45, 'cage3' => 35]), 'user_id' => $user->id,
            'occurred_at' => now()->subHours(2), 'created_at' => now(), 'updated_at' => now(),
        ]);

        $nurseryContainer = Container::query()->updateOrCreate(['serial' => 'BSF000106'], [
            'part_id' => Part::where('code', 'WIP-NUR')->value('id'), 'location_id' => Location::where('code', 'RACK-01-N2')->value('id'),
            'status' => 'INCUBATING', 'origin' => 'PRODUCTION', 'production_lot' => now()->toDateString(),
            'lot_code' => 'NUR-'.now()->format('Ymd'), 'life_stage' => 'LARVA_N0_N5', 'parent_colony' => 'COL-01',
            'quantity_current' => 970, 'unit' => 'g', 'active' => true, 'quarantined' => false,
        ]);
        NurseryBatch::query()->updateOrCreate(['container_id' => $nurseryContainer->id], [
            'rack' => 'RACK-01', 'level' => 2, 'tray_color' => 'Naranja', 'status' => 'INCUBATING',
            'recipe' => ['eggs' => 9, 'feed' => 240, 'water' => 560, 'bran' => 150],
            'started_at' => now()->subHours(52), 'level_at' => now()->subHours(26),
        ]);

        foreach (Operation::all() as $operation) {
            DB::table('work_instructions')->updateOrInsert(
                ['operation_id' => $operation->id, 'version' => 1],
                [
                    'title' => "IT-{$operation->code} · {$operation->name}",
                    'steps' => json_encode([
                        'Verificar limpieza, identificación y estado del workcenter.',
                        'Escanear o seleccionar la orden y los contenedores autorizados.',
                        'Ejecutar el proceso y registrar cantidades, tiempo y observaciones.',
                        'Identificar la salida y confirmar la genealogía antes de liberar.',
                    ]),
                    'required_fields' => json_encode(['quantity_in', 'quantity_out', 'operator', 'occurred_at']),
                    'active' => true, 'approved_by' => $user->id, 'approved_at' => now(),
                    'created_at' => now(), 'updated_at' => now(),
                ],
            );
        }

        $demoOrder = ProductionOrder::query()->updateOrCreate(['number' => 'OP-DEMO-001'], [
            'part_id' => $routePart->id, 'status' => 'PLANNED', 'priority' => 'HIGH',
            'planned_quantity' => 250, 'completed_quantity' => 0, 'unit' => $routePart->unit,
            'scheduled_start' => now()->addDay()->startOfDay()->addHours(7),
            'scheduled_end' => now()->addDays(2)->startOfDay()->addHours(18),
            'notes' => 'Orden demostrativa para validar programación, liberación y ejecución.', 'created_by' => $user->id,
        ]);
        foreach (DB::table('process_routes')->where('part_id', $routePart->id)->orderBy('sequence')->get() as $route) {
            DB::table('production_order_operations')->updateOrInsert(
                ['production_order_id' => $demoOrder->id, 'operation_id' => $route->operation_id],
                [
                    'work_instruction_id' => DB::table('work_instructions')->where('operation_id', $route->operation_id)->where('active', true)->value('id'),
                    'sequence' => $route->sequence, 'status' => 'PENDING', 'planned_quantity' => 250,
                    'actual_input' => 0, 'actual_output' => 0, 'created_at' => now(), 'updated_at' => now(),
                ],
            );
        }

        foreach ([
            ['SUB-MOIST', 'Humedad de sustrato recibido', 'RECEPTION', 'F-001', 'Humedad', 'Medidor de humedad calibrado', 55, 75, 65, '%', 'Una muestra compuesta por lote', true],
            ['NUR-TEMP', 'Temperatura de guardería', 'NURSERY', 'WIP-NUR', 'Temperatura', 'Termómetro calibrado', 26, 32, 29, '°C', 'Cada turno', true],
            ['LAR-MOIST', 'Humedad de larva cosechada', 'HARVEST', 'BSF005', 'Humedad', 'Método gravimétrico validado', 55, 75, 65, '%', 'Por lote', false],
            ['FG-MOIST', 'Humedad de producto terminado', 'FINISHED_GOOD', 'FG-MEAL', 'Humedad', 'Método gravimétrico validado', null, 10, 8, '%', 'Por lote', true],
        ] as [$code, $name, $stage, $part, $characteristic, $method, $min, $max, $target, $unit, $sampling, $critical]) {
            DB::table('quality_specifications')->updateOrInsert(['code' => $code], [
                'name' => $name, 'stage' => $stage, 'part_id' => Part::where('code', $part)->value('id'),
                'characteristic' => $characteristic, 'method' => $method, 'min_value' => $min, 'max_value' => $max,
                'target_value' => $target, 'unit' => $unit, 'sampling_plan' => $sampling, 'critical' => $critical,
                'active' => true, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        foreach ([
            ['REPRODUCCIÓN', 'Temperatura', 25, 32, '°C'], ['REPRODUCCIÓN', 'Humedad relativa', 60, 80, '%HR'],
            ['GUARDERÍA', 'Temperatura', 26, 32, '°C'], ['GUARDERÍA', 'Humedad relativa', 60, 80, '%HR'],
            ['BIOCONVERSIÓN', 'Temperatura', 24, 36, '°C'], ['BIOCONVERSIÓN', 'Humedad relativa', 50, 80, '%HR'],
        ] as [$stage, $parameter, $min, $max, $unit]) {
            DB::table('environmental_limits')->updateOrInsert(['stage' => $stage, 'parameter' => $parameter], [
                'min_value' => $min, 'max_value' => $max, 'unit' => $unit, 'active' => true,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        foreach ([
            ['EQ-NUR-01', 'Incubadora de guardería', 'EQUIPMENT', 'WC-NUR', 'HIGH', 'Insetti', 'NUR-001', 30, null],
            ['EQ-REA-01', 'Sistema de alimentación de engorda', 'EQUIPMENT', 'WC-REA', 'CRITICAL', 'Insetti', 'REA-001', 14, null],
            ['INS-BAL-01', 'Báscula de proceso', 'INSTRUMENT', 'WC-REA', 'CRITICAL', 'Ohaus', 'BAL-001', null, 30],
            ['INS-TH-01', 'Termohigrómetro de guardería', 'INSTRUMENT', 'WC-NUR', 'HIGH', 'Testo', 'TH-001', null, 30],
        ] as [$code, $name, $type, $workCenter, $criticality, $manufacturer, $serial, $maintenanceDays, $calibrationDays]) {
            DB::table('assets')->updateOrInsert(['code' => $code], [
                'name' => $name,
                'type' => $type,
                'work_center_id' => WorkCenter::where('code', $workCenter)->value('id'),
                'status' => 'AVAILABLE',
                'criticality' => $criticality,
                'manufacturer' => $manufacturer,
                'serial_number' => $serial,
                'next_maintenance_at' => $maintenanceDays ? today()->addDays($maintenanceDays) : null,
                'calibration_due_at' => $calibrationDays ? today()->addDays($calibrationDays) : null,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        foreach ([
            ['REP-BAL-01', 'Celda de carga para báscula', 3, 1, 'pc', 'ALM-MRO'],
            ['REP-MOT-01', 'Motorreductor de alimentación', 2, 1, 'pc', 'ALM-MRO'],
            ['REP-FIL-01', 'Filtro sanitario', 12, 4, 'pc', 'ALM-MRO'],
        ] as [$code, $name, $quantity, $reorder, $unit, $storage]) {
            DB::table('spare_parts')->updateOrInsert(['code' => $code], [
                'name' => $name,
                'quantity_on_hand' => $quantity,
                'reorder_point' => $reorder,
                'unit' => $unit,
                'storage_location' => $storage,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
