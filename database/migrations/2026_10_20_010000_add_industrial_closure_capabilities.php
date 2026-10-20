<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shifts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->time('starts_at');
            $table->time('ends_at');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('downtime_reasons', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('category', 20);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('downtime_events', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('work_center_id')->constrained()->restrictOnDelete();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('downtime_reason_id')->constrained()->restrictOnDelete();
            $table->string('status', 20)->default('OPEN')->index();
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->unsignedInteger('duration_minutes')->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('oee_snapshots', function (Blueprint $table) {
            $table->id();
            $table->date('production_date');
            $table->foreignId('shift_id')->constrained()->restrictOnDelete();
            $table->foreignId('work_center_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('planned_minutes');
            $table->unsignedInteger('downtime_minutes')->default(0);
            $table->decimal('ideal_cycle_minutes', 12, 4);
            $table->decimal('total_count', 14, 4);
            $table->decimal('good_count', 14, 4);
            $table->decimal('availability', 7, 3);
            $table->decimal('performance', 7, 3);
            $table->decimal('quality', 7, 3);
            $table->decimal('oee', 7, 3);
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['production_date', 'shift_id', 'work_center_id']);
        });

        Schema::create('certificates_of_analysis', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('container_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('DRAFT')->index();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
        });

        Schema::create('certificate_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('certificate_of_analysis_id')->constrained('certificates_of_analysis')->cascadeOnDelete();
            $table->foreignId('quality_inspection_id')->constrained()->restrictOnDelete();
            $table->timestamps();
            $table->unique(['certificate_of_analysis_id', 'quality_inspection_id'], 'coa_result_unique');
        });

        Schema::create('retention_samples', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->foreignId('container_id')->constrained()->restrictOnDelete();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->string('unit', 20);
            $table->string('storage_location');
            $table->date('retained_at');
            $table->date('expires_at');
            $table->string('status', 20)->default('AVAILABLE');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('spare_parts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->decimal('quantity_on_hand', 14, 4)->default(0);
            $table->decimal('reorder_point', 14, 4)->default(0);
            $table->string('unit', 20);
            $table->string('storage_location')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('maintenance_spare_part_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('maintenance_work_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('spare_part_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        $this->seedIndustrialCatalogs();
        $this->correctProcessRoutes();
    }

    private function seedIndustrialCatalogs(): void
    {
        foreach ([
            ['T1', 'Turno matutino', '06:00', '14:00'],
            ['T2', 'Turno vespertino', '14:00', '22:00'],
            ['T3', 'Turno nocturno', '22:00', '06:00'],
        ] as [$code, $name, $start, $end]) {
            DB::table('shifts')->insertOrIgnore(['code' => $code, 'name' => $name, 'starts_at' => $start, 'ends_at' => $end, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        }

        foreach ([
            ['FAILURE', 'Falla de equipo', 'UNPLANNED'],
            ['MATERIAL', 'Falta de material', 'UNPLANNED'],
            ['QUALITY', 'Retención de calidad', 'UNPLANNED'],
            ['CHANGEOVER', 'Cambio y limpieza', 'PLANNED'],
            ['MAINTENANCE', 'Mantenimiento programado', 'PLANNED'],
        ] as [$code, $name, $category]) {
            DB::table('downtime_reasons')->insertOrIgnore(['code' => $code, 'name' => $name, 'category' => $category, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        }

        foreach ([
            ['REP-BAL-01', 'Celda de carga para báscula', 3, 1, 'pc', 'ALM-MRO'],
            ['REP-MOT-01', 'Motorreductor de alimentación', 2, 1, 'pc', 'ALM-MRO'],
            ['REP-FIL-01', 'Filtro sanitario', 12, 4, 'pc', 'ALM-MRO'],
        ] as [$code, $name, $quantity, $reorder, $unit, $storage]) {
            DB::table('spare_parts')->insertOrIgnore([
                'code' => $code,
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

    private function correctProcessRoutes(): void
    {
        $partIds = DB::table('parts')->whereIn('code', ['BSF002', 'BSF005', 'FG-BOX'])->pluck('id', 'code');
        $operationIds = DB::table('operations')->pluck('id', 'code');
        $routes = [
            'BSF005' => ['EGG', 'NUR', 'TRA', 'REA', 'HAR'],
            'FG-BOX' => ['WAS', 'SAN', 'DRY', 'FRA', 'GRI', 'PAC', 'BOX', 'SHP'],
            'BSF002' => ['PUP', 'DAR', 'LOV'],
        ];

        foreach ($routes as $partCode => $operations) {
            if (! isset($partIds[$partCode])) {
                continue;
            }
            DB::table('process_routes')->where('part_id', $partIds[$partCode])->delete();
            foreach ($operations as $index => $operationCode) {
                if (isset($operationIds[$operationCode])) {
                    DB::table('process_routes')->insert([
                        'part_id' => $partIds[$partCode],
                        'operation_id' => $operationIds[$operationCode],
                        'sequence' => ($index + 1) * 10,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        if (isset($partIds['BSF005'])) {
            DB::table('production_order_operations')
                ->whereIn('production_order_id', DB::table('production_orders')->where('part_id', $partIds['BSF005'])->whereIn('status', ['PLANNED', 'RELEASED', 'IN_PROGRESS'])->select('id'))
                ->where('status', '!=', 'COMPLETED')
                ->whereIn('operation_id', DB::table('operations')->whereIn('code', ['WAS', 'SAN', 'DRY', 'FRA', 'GRI', 'PAC', 'BOX', 'SHP', 'PUP', 'DAR', 'LOV'])->select('id'))
                ->delete();
        }
    }

    public function down(): void
    {
        foreach (['maintenance_spare_part_usages', 'spare_parts', 'retention_samples', 'certificate_results', 'certificates_of_analysis', 'oee_snapshots', 'downtime_events', 'downtime_reasons', 'shifts'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
