<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('work_center_shift_capacities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_center_id')->constrained()->cascadeOnDelete();
            $table->foreignId('shift_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('available_minutes')->default(480);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['work_center_id', 'shift_id']);
        });

        Schema::create('planning_runs', function (Blueprint $table) {
            $table->id();
            $table->string('status', 30)->index();
            $table->timestamp('horizon_start');
            $table->timestamp('horizon_end');
            $table->unsignedInteger('orders_scheduled')->default(0);
            $table->unsignedInteger('operations_scheduled')->default(0);
            $table->unsignedInteger('late_orders')->default(0);
            $table->unsignedInteger('unscheduled_operations')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('completed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('production_schedule_segments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('planning_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('production_order_operation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_center_id')->constrained()->restrictOnDelete();
            $table->foreignId('shift_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('segment_sequence');
            $table->timestamp('planned_start');
            $table->timestamp('planned_end');
            $table->unsignedInteger('planned_minutes');
            $table->timestamps();
            $table->unique(['planning_run_id', 'production_order_operation_id', 'segment_sequence'], 'schedule_segment_sequence_unique');
            $table->index(['work_center_id', 'planned_start', 'planned_end'], 'schedule_center_window_index');
        });

        Schema::table('production_order_operations', function (Blueprint $table) {
            $table->timestamp('planned_start')->nullable()->after('planned_quantity');
            $table->timestamp('planned_end')->nullable()->after('planned_start');
            $table->unsignedInteger('planned_minutes')->nullable()->after('planned_end');
            $table->string('schedule_status', 30)->nullable()->after('planned_minutes');
            $table->boolean('schedule_locked')->default(false)->after('schedule_status');
        });
    }

    public function down(): void
    {
        Schema::table('production_order_operations', function (Blueprint $table) {
            $table->dropColumn(['planned_start', 'planned_end', 'planned_minutes', 'schedule_status', 'schedule_locked']);
        });
        Schema::dropIfExists('production_schedule_segments');
        Schema::dropIfExists('planning_runs');
        Schema::dropIfExists('work_center_shift_capacities');
    }
};
