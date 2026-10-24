<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('locations', function (Blueprint $table) {
            $table->string('zone', 50)->nullable()->after('type');
            $table->unsignedInteger('pick_priority')->default(100)->after('zone');
            $table->boolean('shipping_enabled')->default(false)->after('pick_priority');
        });
        DB::table('locations')->where('code', 'ALM-PT')->update(['zone' => 'PRODUCTO_TERMINADO', 'pick_priority' => 10]);
        DB::table('locations')->where('code', 'WC-SHP')->update(['zone' => 'DESPACHO', 'pick_priority' => 1, 'shipping_enabled' => true]);

        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 30)->unique();
            $table->string('name');
            $table->string('customer_type', 30)->default('INDUSTRIAL');
            $table->string('tax_id', 30)->nullable();
            $table->string('contact_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone', 40)->nullable();
            $table->boolean('active')->default(true);
            $table->timestamps();
        });

        Schema::create('sales_orders', function (Blueprint $table) {
            $table->id();
            $table->string('number', 40)->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->string('status', 30)->default('DRAFT')->index();
            $table->string('priority', 20)->default('NORMAL');
            $table->date('requested_at');
            $table->date('promised_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('released_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('released_at')->nullable();
            $table->timestamps();
        });

        Schema::create('sales_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('part_id')->constrained()->restrictOnDelete();
            $table->decimal('ordered_quantity', 14, 4);
            $table->decimal('allocated_quantity', 14, 4)->default(0);
            $table->decimal('shipped_quantity', 14, 4)->default(0);
            $table->string('unit', 20);
            $table->string('status', 30)->default('OPEN');
            $table->timestamps();
        });

        Schema::create('shipment_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_order_line_id')->constrained()->cascadeOnDelete();
            $table->foreignId('container_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->string('status', 30)->default('ALLOCATED')->index();
            $table->foreignId('allocated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('picked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('picked_at')->nullable();
            $table->timestamps();
            $table->unique(['sales_order_line_id', 'container_id']);
        });

        Schema::create('shipments', function (Blueprint $table) {
            $table->id();
            $table->string('number', 40)->unique();
            $table->foreignId('sales_order_id')->constrained()->restrictOnDelete();
            $table->string('status', 30)->default('READY')->index();
            $table->string('carrier')->nullable();
            $table->string('tracking_number')->nullable();
            $table->string('vehicle')->nullable();
            $table->string('seal')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('shipped_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });

        Schema::create('shipment_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('shipment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('sales_order_line_id')->constrained()->restrictOnDelete();
            $table->foreignId('container_id')->constrained()->restrictOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->string('unit', 20);
            $table->timestamps();
        });

        Schema::create('customer_returns', function (Blueprint $table) {
            $table->id();
            $table->string('number', 40)->unique();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->foreignId('shipment_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('container_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('quantity', 14, 4);
            $table->string('unit', 20);
            $table->string('reason');
            $table->string('disposition', 30)->default('QUARANTINE');
            $table->string('status', 30)->default('OPEN')->index();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('received_at');
            $table->timestamps();
        });

        Schema::create('recall_events', function (Blueprint $table) {
            $table->id();
            $table->string('number', 40)->unique();
            $table->string('type', 20)->default('MOCK');
            $table->string('reference_type', 30);
            $table->string('reference');
            $table->string('reason');
            $table->string('status', 30)->default('OPEN')->index();
            $table->text('closure_notes')->nullable();
            $table->foreignId('initiated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('closed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('recall_impacted_containers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recall_event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('container_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('shipment_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 30)->default('HOLD');
            $table->timestamp('notified_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->unique(['recall_event_id', 'container_id', 'shipment_id']);
        });
    }

    public function down(): void
    {
        foreach (['recall_impacted_containers', 'recall_events', 'customer_returns', 'shipment_items', 'shipments', 'shipment_allocations', 'sales_order_lines', 'sales_orders', 'customers'] as $table) {
            Schema::dropIfExists($table);
        }

        Schema::table('locations', function (Blueprint $table) {
            $table->dropColumn(['zone', 'pick_priority', 'shipping_enabled']);
        });
    }
};
