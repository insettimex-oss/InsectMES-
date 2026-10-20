<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feeding_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('target_container_id')->constrained('containers')->restrictOnDelete();
            $table->foreignId('substrate_container_id')->constrained('containers')->restrictOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->decimal('dry_matter_percent', 7, 3)->nullable();
            $table->string('unit', 20);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['target_container_id', 'occurred_at']);
        });

        Schema::create('quality_deviations', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('container_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source', 40);
            $table->string('severity', 20);
            $table->string('status', 30)->default('OPEN')->index();
            $table->string('title');
            $table->text('description');
            $table->text('immediate_action')->nullable();
            $table->text('root_cause')->nullable();
            $table->text('disposition')->nullable();
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('corrective_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quality_deviation_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20);
            $table->text('description');
            $table->string('status', 30)->default('OPEN');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('due_at')->nullable();
            $table->text('effectiveness_result')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('type', 40);
            $table->foreignId('work_center_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 30)->default('AVAILABLE')->index();
            $table->string('criticality', 20)->default('MEDIUM');
            $table->string('manufacturer')->nullable();
            $table->string('serial_number')->nullable();
            $table->date('next_maintenance_at')->nullable();
            $table->date('calibration_due_at')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('maintenance_work_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('asset_id')->constrained()->restrictOnDelete();
            $table->string('type', 30);
            $table->string('priority', 20)->default('NORMAL');
            $table->string('status', 30)->default('OPEN')->index();
            $table->text('description');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->unsignedInteger('downtime_minutes')->default(0);
            $table->text('result')->nullable();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('completed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['maintenance_work_orders', 'assets', 'corrective_actions', 'quality_deviations', 'feeding_events'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
