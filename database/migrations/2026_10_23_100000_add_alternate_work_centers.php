<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('operation_work_center_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('operation_id')->constrained()->cascadeOnDelete();
            $table->foreignId('work_center_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('priority')->default(50);
            $table->decimal('efficiency_factor', 8, 4)->default(1);
            $table->string('qualification_status', 30)->default('PENDING')->index();
            $table->timestamp('valid_from')->nullable();
            $table->timestamp('valid_to')->nullable();
            $table->boolean('active')->default(true);
            $table->text('notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['operation_id', 'work_center_id'], 'operation_center_option_unique');
        });

        Schema::table('production_order_operations', function (Blueprint $table) {
            $table->foreignId('planned_work_center_id')->nullable()->after('operation_id')->constrained('work_centers')->nullOnDelete();
            $table->string('work_center_selection', 80)->nullable()->after('schedule_reason');
        });

        Schema::table('planning_runs', function (Blueprint $table) {
            $table->unsignedInteger('alternate_centers_used')->default(0)->after('changeover_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('planning_runs', function (Blueprint $table) {
            $table->dropColumn('alternate_centers_used');
        });

        Schema::table('production_order_operations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('planned_work_center_id');
            $table->dropColumn('work_center_selection');
        });

        Schema::dropIfExists('operation_work_center_options');
    }
};
