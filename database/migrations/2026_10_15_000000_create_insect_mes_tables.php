<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('operator')->after('email');
            $table->string('company')->default('Insetti')->after('role');
        });

        Schema::create('parts', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('description');
            $table->string('unit', 20);
            $table->string('type', 40);
            $table->string('serial_prefix', 12)->default('BSF');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('locations', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('description');
            $table->string('type', 40)->default('Workcenter');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('work_centers', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('description');
            $table->string('status', 40)->default('IDLE');
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('operations', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('area', 60);
            $table->foreignId('work_center_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('input_part_id')->nullable()->constrained('parts')->nullOnDelete();
            $table->foreignId('output_part_id')->constrained('parts')->restrictOnDelete();
            $table->decimal('duration_hours', 8, 2)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('process_routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained()->cascadeOnDelete();
            $table->foreignId('operation_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            $table->timestamps();
            $table->unique(['part_id', 'operation_id']);
        });

        Schema::create('bom_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('component_part_id')->constrained('parts')->restrictOnDelete();
            $table->decimal('quantity_per_unit', 14, 6);
            $table->string('unit', 20);
            $table->boolean('active')->default(true);
            $table->timestamps();
            $table->unique(['parent_part_id', 'component_part_id']);
        });

        Schema::create('containers', function (Blueprint $table) {
            $table->id();
            $table->string('serial')->unique();
            $table->foreignId('part_id')->constrained()->restrictOnDelete();
            $table->foreignId('location_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 30)->default('OK');
            $table->string('origin', 30)->default('PRODUCTION');
            $table->string('supplier_lot')->nullable();
            $table->date('production_lot')->nullable();
            $table->decimal('quantity_current', 14, 4);
            $table->string('unit', 20);
            $table->boolean('active')->default(true);
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['part_id', 'status', 'active']);
        });

        Schema::create('inventory_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('container_id')->constrained()->cascadeOnDelete();
            $table->string('type', 30);
            $table->decimal('quantity', 14, 4);
            $table->string('unit', 20);
            $table->foreignId('from_location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->foreignId('to_location_id')->nullable()->constrained('locations')->nullOnDelete();
            $table->string('reference')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamps();
        });

        Schema::create('production_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('operation_id')->constrained()->restrictOnDelete();
            $table->foreignId('input_container_id')->nullable()->constrained('containers')->nullOnDelete();
            $table->foreignId('output_container_id')->constrained('containers')->restrictOnDelete();
            $table->decimal('quantity_in', 14, 4)->nullable();
            $table->decimal('quantity_out', 14, 4);
            $table->string('unit', 20);
            $table->json('fields')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamps();
        });

        Schema::create('genealogy_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_container_id')->nullable()->constrained('containers')->nullOnDelete();
            $table->foreignId('child_container_id')->constrained('containers')->cascadeOnDelete();
            $table->foreignId('operation_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 40);
            $table->decimal('quantity', 14, 4)->nullable();
            $table->string('unit', 20)->nullable();
            $table->timestamp('occurred_at');
            $table->timestamps();
        });

        Schema::create('nursery_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('container_id')->constrained()->cascadeOnDelete();
            $table->string('rack', 30)->default('RACK-01');
            $table->unsignedTinyInteger('level')->default(0);
            $table->string('tray_color', 20)->default('Naranja');
            $table->string('status', 30)->default('INCUBATING');
            $table->json('recipe')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('level_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('nursery_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nursery_batch_id')->constrained()->cascadeOnDelete();
            $table->string('action');
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamps();
        });

        Schema::create('work_center_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_center_id')->constrained()->cascadeOnDelete();
            $table->string('status', 40);
            $table->string('previous_status', 40)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamps();
        });

        Schema::create('parameters', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('description');
            $table->decimal('value', 18, 8);
            $table->string('unit', 30);
            $table->string('scope', 30)->default('COST');
            $table->string('source')->nullable();
            $table->boolean('editable')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['parameters', 'work_center_logs', 'nursery_events', 'nursery_batches', 'genealogy_events', 'production_runs', 'inventory_movements', 'containers', 'bom_lines', 'process_routes', 'operations', 'work_centers', 'locations', 'parts'] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'company']);
        });
    }
};
