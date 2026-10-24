<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('validation_protocols', function (Blueprint $table) {
            $table->id();
            $table->string('code', 50);
            $table->string('title');
            $table->string('version', 30);
            $table->string('scope', 120);
            $table->text('objective');
            $table->text('acceptance_criteria');
            $table->string('status', 30)->default('DRAFT')->index();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamps();
            $table->unique(['code', 'version']);
        });

        Schema::create('validation_protocol_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('validation_protocol_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('sequence');
            $table->text('requirement');
            $table->text('expected_result');
            $table->boolean('critical')->default(true);
            $table->timestamps();
            $table->unique(['validation_protocol_id', 'sequence'], 'validation_protocol_step_unique');
        });

        Schema::create('validation_runs', function (Blueprint $table) {
            $table->id();
            $table->string('number', 50)->unique();
            $table->foreignId('validation_protocol_id')->constrained()->restrictOnDelete();
            $table->foreignId('production_order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 30)->default('IN_PROGRESS')->index();
            $table->foreignId('started_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('executed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('approved_at')->nullable();
            $table->text('result_summary')->nullable();
            $table->string('evidence_reference')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamps();
        });

        Schema::create('validation_run_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('validation_run_id')->constrained()->cascadeOnDelete();
            $table->foreignId('validation_protocol_step_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedInteger('sequence');
            $table->text('requirement');
            $table->text('expected_result');
            $table->text('actual_result')->nullable();
            $table->string('status', 20)->default('PENDING')->index();
            $table->boolean('critical')->default(true);
            $table->string('evidence_reference')->nullable();
            $table->foreignId('executed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('executed_at')->nullable();
            $table->timestamps();
            $table->unique(['validation_run_id', 'sequence'], 'validation_run_step_unique');
        });

        Schema::create('electronic_signatures', function (Blueprint $table) {
            $table->id();
            $table->string('signable_type', 100);
            $table->unsignedBigInteger('signable_id');
            $table->string('meaning', 40);
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('signer_name');
            $table->string('role_at_signing');
            $table->text('reason');
            $table->timestamp('credential_verified_at');
            $table->timestamp('signed_at');
            $table->string('digest_sha256', 64)->unique();
            $table->json('context')->nullable();
            $table->timestamps();
            $table->index(['signable_type', 'signable_id']);
            $table->unique(['signable_type', 'signable_id', 'user_id', 'meaning'], 'electronic_signature_unique');
        });

        if (DB::getDriverName() === 'sqlite') {
            DB::statement("CREATE TRIGGER electronic_signatures_no_update BEFORE UPDATE ON electronic_signatures BEGIN SELECT RAISE(ABORT, 'Las firmas electrónicas son inmutables'); END");
            DB::statement("CREATE TRIGGER electronic_signatures_no_delete BEFORE DELETE ON electronic_signatures BEGIN SELECT RAISE(ABORT, 'Las firmas electrónicas son inmutables'); END");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::statement('DROP TRIGGER IF EXISTS electronic_signatures_no_update');
            DB::statement('DROP TRIGGER IF EXISTS electronic_signatures_no_delete');
        }
        Schema::dropIfExists('electronic_signatures');
        Schema::dropIfExists('validation_run_steps');
        Schema::dropIfExists('validation_runs');
        Schema::dropIfExists('validation_protocol_steps');
        Schema::dropIfExists('validation_protocols');
    }
};
