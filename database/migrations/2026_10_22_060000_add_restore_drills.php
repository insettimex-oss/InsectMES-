<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('backup_runs', function (Blueprint $table) {
            $table->string('driver', 30)->default('sqlite')->after('status');
            $table->boolean('integrity_verified')->default(false)->after('size_bytes');
            $table->timestamp('restore_verified_at')->nullable()->after('restore_verified');
        });

        DB::table('backup_runs')->update([
            'restore_verified' => false,
            'restore_verified_at' => null,
        ]);

        Schema::create('restore_drills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('backup_run_id')->constrained('backup_runs')->cascadeOnDelete();
            $table->string('driver', 30);
            $table->string('status', 30)->index();
            $table->unsignedInteger('rto_target_seconds');
            $table->unsignedInteger('duration_seconds')->nullable();
            $table->unsignedInteger('table_count')->nullable();
            $table->boolean('checksum_verified')->default(false);
            $table->boolean('integrity_verified')->default(false);
            $table->text('error')->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('started_at');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restore_drills');
        Schema::table('backup_runs', function (Blueprint $table) {
            $table->dropColumn(['driver', 'integrity_verified', 'restore_verified_at']);
        });
    }
};
