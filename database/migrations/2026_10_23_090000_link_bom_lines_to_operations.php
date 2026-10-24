<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bom_lines', function (Blueprint $table) {
            $table->foreignId('operation_id')->nullable()->after('component_part_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bom_lines', function (Blueprint $table) {
            $table->dropConstrainedForeignId('operation_id');
        });
    }
};
