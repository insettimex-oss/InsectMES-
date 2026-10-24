<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('work_centers', function (Blueprint $table) {
            $table->unsignedInteger('parallel_capacity')->default(1)->after('status');
        });

        Schema::table('operations', function (Blueprint $table) {
            $table->string('scheduling_mode', 20)->default('ACTIVE')->after('duration_hours');
        });

        Schema::create('production_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('family', 80)->index();
            $table->foreignId('part_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('priority')->default(50);
            $table->timestamp('planned_start')->nullable();
            $table->timestamp('planned_end')->nullable();
            $table->string('status', 30)->default('ACTIVE')->index();
            $table->boolean('active')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('production_orders', function (Blueprint $table) {
            $table->foreignId('campaign_id')->nullable()->after('part_id')->constrained('production_campaigns')->nullOnDelete();
        });

        Schema::create('work_center_changeover_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_center_id')->constrained()->cascadeOnDelete();
            $table->string('from_family', 80)->default('*');
            $table->string('to_family', 80);
            $table->unsignedInteger('setup_minutes');
            $table->boolean('cleaning_required')->default(true);
            $table->boolean('active')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['work_center_id', 'from_family', 'to_family'], 'changeover_rule_unique');
        });

        Schema::create('biological_planning_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained()->cascadeOnDelete();
            $table->foreignId('operation_id')->constrained()->cascadeOnDelete();
            $table->decimal('minimum_age_hours', 10, 2)->default(0);
            $table->decimal('target_age_hours', 10, 2)->nullable();
            $table->decimal('maximum_age_hours', 10, 2);
            $table->boolean('active')->default(true);
            $table->text('rationale')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['part_id', 'operation_id']);
        });

        Schema::create('material_supply_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 16, 4);
            $table->string('unit', 20);
            $table->timestamp('available_at')->index();
            $table->string('status', 30)->default('PLANNED')->index();
            $table->string('source', 80);
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('planning_runs', function (Blueprint $table) {
            $table->unsignedInteger('campaigns_scheduled')->default(0)->after('operations_scheduled');
            $table->unsignedInteger('changeover_minutes')->default(0)->after('campaigns_scheduled');
            $table->unsignedInteger('material_shortages')->default(0)->after('unscheduled_operations');
            $table->unsignedInteger('biological_violations')->default(0)->after('material_shortages');
        });

        Schema::table('production_schedule_segments', function (Blueprint $table) {
            $table->string('segment_type', 30)->default('RUN')->after('segment_sequence');
            $table->foreignId('campaign_id')->nullable()->after('shift_id')->constrained('production_campaigns')->nullOnDelete();
            $table->text('notes')->nullable()->after('planned_minutes');
        });

        Schema::table('production_order_operations', function (Blueprint $table) {
            $table->string('schedule_reason', 80)->nullable()->after('schedule_status');
        });

        Schema::create('planning_material_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planning_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('production_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained()->restrictOnDelete();
            $table->foreignId('material_supply_event_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source', 30);
            $table->decimal('quantity', 16, 4);
            $table->timestamp('available_at');
            $table->timestamps();
            $table->index(['planning_run_id', 'production_order_id'], 'material_allocation_run_order_index');
        });

        Schema::create('biological_schedule_occupancies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planning_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('production_order_operation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_center_id')->constrained()->restrictOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained('production_campaigns')->nullOnDelete();
            $table->timestamp('planned_start');
            $table->timestamp('planned_end');
            $table->unsignedInteger('capacity_units')->default(1);
            $table->timestamps();
            $table->unique(['planning_run_id', 'production_order_operation_id'], 'biological_occupancy_unique');
            $table->index(['work_center_id', 'planned_start', 'planned_end'], 'biological_center_window_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('biological_schedule_occupancies');
        Schema::dropIfExists('planning_material_allocations');

        Schema::table('production_order_operations', function (Blueprint $table) {
            $table->dropColumn('schedule_reason');
        });

        Schema::table('production_schedule_segments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('campaign_id');
            $table->dropColumn(['segment_type', 'notes']);
        });

        Schema::table('planning_runs', function (Blueprint $table) {
            $table->dropColumn(['campaigns_scheduled', 'changeover_minutes', 'material_shortages', 'biological_violations']);
        });

        Schema::dropIfExists('material_supply_events');
        Schema::dropIfExists('biological_planning_rules');
        Schema::dropIfExists('work_center_changeover_rules');

        Schema::table('production_orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('campaign_id');
        });

        Schema::dropIfExists('production_campaigns');

        Schema::table('operations', function (Blueprint $table) {
            $table->dropColumn('scheduling_mode');
        });

        Schema::table('work_centers', function (Blueprint $table) {
            $table->dropColumn('parallel_capacity');
        });
    }
};
