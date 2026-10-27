<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AlegraIntegrationSeeder extends Seeder
{
    public function run(): void
    {
        $creatorId = User::query()->where('email', 'admin@insetti.com')->value('id');

        foreach ([
            [
                'code' => 'ALEGRA-CONTACTS',
                'name' => 'Alegra · alta de contactos',
                'base_url' => 'https://api.alegra.com/api/v1/contacts',
            ],
            [
                'code' => 'ALEGRA-INVOICES',
                'name' => 'Alegra · facturas de venta',
                'base_url' => 'https://api.alegra.com/api/v1/invoices',
            ],
        ] as $endpoint) {
            DB::table('integration_endpoints')->updateOrInsert(
                ['code' => $endpoint['code']],
                [
                    'name' => $endpoint['name'],
                    'system' => 'Alegra',
                    'direction' => 'OUTBOUND',
                    'transport' => 'HTTP',
                    'connector_driver' => 'ALEGRA',
                    'base_url' => $endpoint['base_url'],
                    'auth_scheme' => 'BASIC_ENV',
                    'username_env_key' => 'ALEGRA_API_EMAIL',
                    'secret_env_key' => 'ALEGRA_API_TOKEN',
                    'timeout_seconds' => 30,
                    'max_attempts' => 3,
                    'retry_backoff_seconds' => 60,
                    'active' => false,
                    'health_status' => 'PENDING_CONFIGURATION',
                    'last_health_at' => null,
                    'last_health_message' => 'Requiere credenciales, mapeo contable validado y activación de TI.',
                    'created_by' => $creatorId,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            );
        }
    }
}
