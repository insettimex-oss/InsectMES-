<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mes_container_statuses', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name');
            foreach (['active', 'ok', 'allow_production', 'allow_move', 'allow_split', 'allow_merge'] as $flag) {
                $table->boolean($flag)->default(false);
            }
            $table->timestamps();
        });
        $codes = DB::table('containers')->distinct()->pluck('status')->merge(['OK', 'HOLD', 'CONSUMED', 'READY', 'INCUBATING', 'REJECTED'])->unique();
        foreach ($codes as $code) {
            $available = in_array($code, ['OK', 'READY'], true);
            DB::table('mes_container_statuses')->insert([
                'code' => $code, 'name' => $code, 'active' => ! in_array($code, ['CONSUMED', 'REJECTED'], true),
                'ok' => $available, 'allow_production' => $available, 'allow_move' => $available || $code === 'INCUBATING',
                'allow_split' => $available, 'allow_merge' => $available, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        Schema::create('mes_settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->json('value');
            $table->timestamps();
        });
        Schema::create('mes_source_loads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_center_id')->constrained()->restrictOnDelete();
            $table->foreignId('container_id')->constrained()->restrictOnDelete();
            $table->foreignId('loaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['work_center_id', 'container_id']);
        });
        Schema::create('mes_operation_requests', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('action');
            $table->string('payload_hash', 64);
            $table->json('result')->nullable();
            $table->timestamps();
        });
        Schema::create('mes_recipes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained()->restrictOnDelete();
            $table->foreignId('operation_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('basis', 20)->default('quantity');
            $table->decimal('batch_quantity', 14, 6)->nullable();
            $table->string('unit', 20);
            $table->boolean('active')->default(true);
            $table->json('components');
            $table->json('byproducts')->nullable();
            $table->timestamps();
        });
        Schema::create('mes_label_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->decimal('width_mm', 8, 2)->default(36);
            $table->decimal('height_mm', 8, 2)->default(24);
            $table->json('elements');
            $table->foreignId('part_id')->nullable()->constrained()->restrictOnDelete();
            $table->foreignId('operation_id')->nullable()->constrained()->restrictOnDelete();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
        Schema::create('mes_suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();
            $table->string('name');
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });
        Schema::create('mes_purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number')->unique();
            $table->foreignId('supplier_id')->constrained('mes_suppliers')->restrictOnDelete();
            $table->foreignId('part_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 14, 6);
            $table->decimal('received_quantity', 14, 6)->default(0);
            $table->string('unit', 20);
            $table->string('status', 20)->default('OPEN');
            $table->date('due_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Rollback is deliberately explicit; it must never be used against operational data without a backup.
        foreach (['mes_purchase_orders', 'mes_suppliers', 'mes_label_templates', 'mes_recipes', 'mes_operation_requests', 'mes_source_loads', 'mes_settings', 'mes_container_statuses'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
