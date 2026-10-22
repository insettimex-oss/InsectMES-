<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('production_order_operations', function (Blueprint $table) {
            $table->decimal('actual_scrap', 14, 4)->default(0)->after('actual_output');
            $table->unsignedInteger('active_minutes')->default(0)->after('actual_scrap');
        });

        Schema::create('production_execution_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_operation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_center_id')->constrained()->restrictOnDelete();
            $table->foreignId('operator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('RUNNING')->index();
            $table->timestamp('started_at');
            $table->timestamp('last_resumed_at')->nullable();
            $table->timestamp('paused_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('active_minutes')->default(0);
            $table->text('pause_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('production_checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_operation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_instruction_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('step_index');
            $table->text('description');
            $table->boolean('completed')->default(false);
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['production_order_operation_id', 'step_index'], 'production_checklist_step_unique');
        });

        Schema::create('scrap_reason_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('category', 30);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('production_scrap_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_execution_session_id')->constrained()->cascadeOnDelete();
            $table->foreignId('production_order_operation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('container_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('scrap_reason_code_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->string('unit', 20);
            $table->text('notes')->nullable();
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reported_at');
            $table->timestamps();
        });

        foreach ([
            ['BIO-MORT', 'Mortalidad fuera del patrón', 'BIOLOGICAL'],
            ['MAT-CONT', 'Materia prima contaminada o no conforme', 'MATERIAL'],
            ['PROC-DEV', 'Desviación del proceso', 'PROCESS'],
            ['PROC-SET', 'Ajuste o preparación incorrecta', 'PROCESS'],
            ['QUAL-FAIL', 'Resultado de calidad no conforme', 'QUALITY'],
        ] as [$code, $name, $category]) {
            DB::table('scrap_reason_codes')->insertOrIgnore([
                'code' => $code,
                'name' => $name,
                'category' => $category,
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        foreach (['production_scrap_events', 'scrap_reason_codes', 'production_checklist_items', 'production_execution_sessions'] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::table('production_order_operations', function (Blueprint $table) {
            $table->dropColumn(['actual_scrap', 'active_minutes']);
        });
    }
};
