<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_endpoints', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50)->unique();
            $table->string('name');
            $table->string('system', 80);
            $table->string('direction', 20);
            $table->string('transport', 20);
            $table->string('base_url')->nullable();
            $table->string('secret_env_key')->nullable();
            $table->unsignedInteger('timeout_seconds')->default(10);
            $table->unsignedInteger('max_attempts')->default(5);
            $table->unsignedInteger('retry_backoff_seconds')->default(60);
            $table->boolean('active')->default(true)->index();
            $table->string('health_status', 20)->default('UNCHECKED');
            $table->timestamp('last_health_at')->nullable();
            $table->string('last_health_message')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('integration_messages', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('integration_endpoint_id')->constrained()->restrictOnDelete();
            $table->string('direction', 20)->index();
            $table->string('message_type', 80)->index();
            $table->string('idempotency_key', 120);
            $table->string('correlation_id', 120)->nullable()->index();
            $table->string('entity_type', 100)->nullable();
            $table->string('entity_id', 100)->nullable();
            $table->json('payload');
            $table->string('payload_sha256', 64);
            $table->string('status', 30)->default('PENDING')->index();
            $table->unsignedInteger('attempt_count')->default(0);
            $table->timestamp('next_attempt_at')->nullable()->index();
            $table->text('last_error')->nullable();
            $table->unsignedSmallInteger('response_code')->nullable();
            $table->text('response_excerpt')->nullable();
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['integration_endpoint_id', 'direction', 'idempotency_key'], 'integration_message_idempotency_unique');
            $table->index(['entity_type', 'entity_id']);
        });

        Schema::create('integration_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('integration_message_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('attempt_number');
            $table->string('status', 30);
            $table->timestamp('started_at');
            $table->timestamp('finished_at');
            $table->unsignedInteger('duration_ms');
            $table->unsignedSmallInteger('response_code')->nullable();
            $table->text('response_excerpt')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();
            $table->unique(['integration_message_id', 'attempt_number'], 'integration_attempt_unique');
        });

        Schema::create('integration_reconciliations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('integration_endpoint_id')->constrained()->restrictOnDelete();
            $table->dateTime('period_from');
            $table->dateTime('period_to');
            $table->unsignedInteger('expected_count');
            $table->unsignedInteger('observed_count');
            $table->unsignedInteger('acknowledged_count');
            $table->unsignedInteger('failed_count');
            $table->integer('difference');
            $table->string('status', 30)->index();
            $table->text('notes')->nullable();
            $table->foreignId('generated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('generated_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_reconciliations');
        Schema::dropIfExists('integration_attempts');
        Schema::dropIfExists('integration_messages');
        Schema::dropIfExists('integration_endpoints');
    }
};
