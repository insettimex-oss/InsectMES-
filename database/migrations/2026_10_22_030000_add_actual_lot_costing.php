<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cost_rates', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->string('category', 30)->index();
            $table->foreignId('part_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('work_center_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('unit_cost', 16, 6);
            $table->string('unit', 30);
            $table->date('effective_from');
            $table->date('effective_to')->nullable();
            $table->boolean('active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('production_cost_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('production_run_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category', 30)->index();
            $table->string('source_type', 40)->default('MANUAL');
            $table->string('source_id')->nullable();
            $table->decimal('quantity', 16, 4);
            $table->string('unit', 30);
            $table->decimal('unit_cost', 16, 6);
            $table->decimal('amount', 16, 4);
            $table->string('description');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('occurred_at');
            $table->timestamps();
            $table->index(['production_order_id', 'category']);
            $table->unique(['production_order_id', 'source_type', 'source_id'], 'cost_entry_source_unique');
        });

        Schema::create('production_lot_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('production_order_id')->unique()->constrained()->cascadeOnDelete();
            $table->decimal('material_cost', 16, 4)->default(0);
            $table->decimal('labor_cost', 16, 4)->default(0);
            $table->decimal('energy_cost', 16, 4)->default(0);
            $table->decimal('overhead_cost', 16, 4)->default(0);
            $table->decimal('coproduct_credit', 16, 4)->default(0);
            $table->decimal('net_cost', 16, 4)->default(0);
            $table->decimal('output_quantity', 16, 4)->default(0);
            $table->string('unit', 20);
            $table->decimal('unit_cost', 16, 6)->default(0);
            $table->string('status', 20)->default('DRAFT')->index();
            $table->text('closure_notes')->nullable();
            $table->foreignId('calculated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('calculated_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('production_lot_costs');
        Schema::dropIfExists('production_cost_entries');
        Schema::dropIfExists('cost_rates');
    }
};
