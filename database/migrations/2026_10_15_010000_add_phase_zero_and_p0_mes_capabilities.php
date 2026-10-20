<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('containers', function (Blueprint $table) {
            $table->string('lot_code')->nullable()->after('serial')->index();
            $table->string('life_stage', 40)->nullable()->after('origin');
            $table->string('parent_colony')->nullable()->after('life_stage');
            $table->boolean('quarantined')->default(false)->after('active');
            $table->date('expires_at')->nullable()->after('production_lot');
        });

        Schema::create('work_instructions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('operation_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->string('title');
            $table->json('steps');
            $table->json('required_fields')->nullable();
            $table->boolean('active')->default(true);
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['operation_id', 'version']);
        });

        Schema::create('production_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('part_id')->constrained()->restrictOnDelete();
            $table->foreignId('work_center_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 30)->default('PLANNED')->index();
            $table->string('priority', 20)->default('NORMAL');
            $table->decimal('planned_quantity', 14, 4);
            $table->decimal('completed_quantity', 14, 4)->default(0);
            $table->string('unit', 20);
            $table->timestamp('scheduled_start');
            $table->timestamp('scheduled_end')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('production_order_operations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('operation_id')->constrained()->restrictOnDelete();
            $table->foreignId('work_instruction_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('sequence');
            $table->string('status', 30)->default('PENDING');
            $table->decimal('planned_quantity', 14, 4);
            $table->decimal('actual_input', 14, 4)->default(0);
            $table->decimal('actual_output', 14, 4)->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('operator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['production_order_id', 'operation_id']);
        });

        Schema::create('production_order_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained()->restrictOnDelete();
            $table->decimal('required_quantity', 14, 4);
            $table->decimal('reserved_quantity', 14, 4)->default(0);
            $table->decimal('consumed_quantity', 14, 4)->default(0);
            $table->string('unit', 20);
            $table->timestamps();
            $table->unique(['production_order_id', 'part_id']);
        });

        Schema::table('production_runs', function (Blueprint $table) {
            $table->foreignId('production_order_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->foreignId('production_order_operation_id')->nullable()->after('production_order_id')->constrained()->nullOnDelete();
        });

        Schema::table('genealogy_events', function (Blueprint $table) {
            $table->uuid('event_group')->nullable()->after('id')->index();
            $table->foreignId('production_order_id')->nullable()->after('operation_id')->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->after('unit')->constrained()->nullOnDelete();
            $table->text('reason')->nullable()->after('user_id');
        });

        Schema::create('quality_specifications', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('stage', 50);
            $table->foreignId('part_id')->nullable()->constrained()->nullOnDelete();
            $table->string('characteristic');
            $table->string('method');
            $table->decimal('min_value', 14, 4)->nullable();
            $table->decimal('max_value', 14, 4)->nullable();
            $table->decimal('target_value', 14, 4)->nullable();
            $table->string('unit', 30)->nullable();
            $table->string('sampling_plan')->default('Por lote');
            $table->boolean('critical')->default(false);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('quality_inspections', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('quality_specification_id')->constrained()->restrictOnDelete();
            $table->foreignId('container_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('supplier_lot')->nullable();
            $table->decimal('result_value', 14, 4)->nullable();
            $table->string('result_text')->nullable();
            $table->string('status', 30);
            $table->string('disposition', 30)->default('HOLD');
            $table->text('notes')->nullable();
            $table->string('evidence_path')->nullable();
            $table->foreignId('inspected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('disposed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamp('disposed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('environmental_limits', function (Blueprint $table) {
            $table->id();
            $table->string('stage', 50);
            $table->string('parameter', 50);
            $table->decimal('min_value', 14, 4)->nullable();
            $table->decimal('max_value', 14, 4)->nullable();
            $table->string('unit', 20);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['stage', 'parameter']);
        });

        Schema::create('environmental_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('environmental_limit_id')->constrained()->restrictOnDelete();
            $table->foreignId('location_id')->constrained()->restrictOnDelete();
            $table->foreignId('container_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('value', 14, 4);
            $table->string('source', 30)->default('MANUAL');
            $table->boolean('within_limits');
            $table->string('alarm_status', 30)->default('NORMAL');
            $table->text('evidence')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('recorded_at');
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamps();
            $table->index(['alarm_status', 'recorded_at']);
        });

        Schema::create('biosecurity_events', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->string('type', 50);
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->string('severity', 20);
            $table->string('status', 30)->default('OPEN');
            $table->text('observation');
            $table->text('immediate_action')->nullable();
            $table->text('corrective_action')->nullable();
            $table->string('evidence_path')->nullable();
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('mass_balances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->constrained()->cascadeOnDelete();
            $table->decimal('substrate_input', 14, 4)->default(0);
            $table->decimal('water_input', 14, 4)->default(0);
            $table->decimal('biomass_input', 14, 4)->default(0);
            $table->decimal('larvae_output', 14, 4)->default(0);
            $table->decimal('frass_output', 14, 4)->default(0);
            $table->decimal('coproduct_output', 14, 4)->default(0);
            $table->decimal('evaporation', 14, 4)->default(0);
            $table->decimal('waste', 14, 4)->default(0);
            $table->decimal('variance', 14, 4)->default(0);
            $table->decimal('variance_percent', 8, 4)->default(0);
            $table->decimal('tolerance_percent', 8, 4)->default(5);
            $table->string('status', 30)->default('OPEN');
            $table->text('notes')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
            $table->unique('production_order_id');
        });

        Schema::create('audit_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('event', 80)->index();
            $table->string('auditable_type', 120);
            $table->string('auditable_id', 80)->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->text('reason');
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->timestamp('occurred_at')->index();
            $table->timestamps();
        });

        Schema::create('backup_runs', function (Blueprint $table) {
            $table->id();
            $table->string('status', 30)->index();
            $table->string('path')->nullable();
            $table->string('checksum', 64)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->boolean('restore_verified')->default(false);
            $table->text('error')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('genealogy_events', function (Blueprint $table) {
            $table->dropConstrainedForeignId('production_order_id');
            $table->dropConstrainedForeignId('user_id');
            $table->dropColumn(['event_group', 'reason']);
        });

        Schema::table('production_runs', function (Blueprint $table) {
            $table->dropConstrainedForeignId('production_order_operation_id');
            $table->dropConstrainedForeignId('production_order_id');
        });

        Schema::table('containers', function (Blueprint $table) {
            $table->dropColumn(['lot_code', 'life_stage', 'parent_colony', 'quarantined', 'expires_at']);
        });

        foreach (['backup_runs', 'audit_events', 'mass_balances', 'biosecurity_events', 'environmental_readings', 'environmental_limits', 'quality_inspections', 'quality_specifications', 'production_order_materials', 'production_order_operations', 'production_orders', 'work_instructions'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
