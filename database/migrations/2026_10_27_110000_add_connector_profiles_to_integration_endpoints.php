<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('integration_endpoints', function (Blueprint $table) {
            $table->string('connector_driver', 40)->default('GENERIC')->after('transport');
            $table->string('auth_scheme', 30)->default('NONE')->after('base_url');
            $table->string('username_env_key', 120)->nullable()->after('auth_scheme');
        });

        DB::table('integration_endpoints')
            ->whereNotNull('secret_env_key')
            ->where('secret_env_key', '!=', '')
            ->update(['auth_scheme' => 'BEARER']);
    }

    public function down(): void
    {
        Schema::table('integration_endpoints', function (Blueprint $table) {
            $table->dropColumn(['connector_driver', 'auth_scheme', 'username_env_key']);
        });
    }
};
