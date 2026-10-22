<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('laboratory_methods', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('category', 30);
            $table->string('result_type', 20)->default('NUMERIC');
            $table->string('unit', 30)->nullable();
            $table->decimal('min_value', 18, 6)->nullable();
            $table->decimal('max_value', 18, 6)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('laboratory_samples', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('container_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('purpose', 30);
            $table->string('status', 30)->default('RECEIVED')->index();
            $table->timestamp('received_at');
            $table->timestamp('due_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('laboratory_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('laboratory_sample_id')->constrained()->cascadeOnDelete();
            $table->foreignId('laboratory_method_id')->constrained()->restrictOnDelete();
            $table->decimal('result_value', 18, 6)->nullable();
            $table->string('result_text')->nullable();
            $table->string('status', 20);
            $table->text('notes')->nullable();
            $table->timestamp('tested_at');
            $table->foreignId('tested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['laboratory_sample_id', 'laboratory_method_id'], 'lab_sample_method_unique');
        });

        Schema::create('maintenance_condition_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('asset_id')->constrained()->cascadeOnDelete();
            $table->string('metric', 40);
            $table->decimal('value', 18, 6);
            $table->string('unit', 30);
            $table->decimal('warning_limit', 18, 6)->nullable();
            $table->decimal('critical_limit', 18, 6)->nullable();
            $table->string('status', 20)->index();
            $table->timestamp('measured_at');
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        foreach ([
            ['MIC-APC', 'Recuento de aerobios mesófilos', 'MICROBIOLOGY', 'NUMERIC', 'UFC/g', null, null],
            ['MIC-YM', 'Recuento de mohos y levaduras', 'MICROBIOLOGY', 'NUMERIC', 'UFC/g', null, null],
            ['CHEM-PROTEIN', 'Proteína cruda', 'CHEMISTRY', 'NUMERIC', '%', null, null],
            ['CHEM-FAT', 'Grasa total', 'CHEMISTRY', 'NUMERIC', '%', null, null],
            ['STAB-MOIST', 'Humedad en estabilidad', 'STABILITY', 'NUMERIC', '%', null, 10],
        ] as [$code, $name, $category, $type, $unit, $min, $max]) {
            DB::table('laboratory_methods')->insertOrIgnore([
                'code' => $code,
                'name' => $name,
                'category' => $category,
                'result_type' => $type,
                'unit' => $unit,
                'min_value' => $min,
                'max_value' => $max,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        foreach (['maintenance_condition_readings', 'laboratory_results', 'laboratory_samples', 'laboratory_methods'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
