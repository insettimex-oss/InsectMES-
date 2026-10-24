<?php

namespace App\Console\Commands;

use App\Services\IntegrationHubService;
use Illuminate\Console\Command;

class MesDispatchIntegrationsCommand extends Command
{
    protected $signature = 'mes:integrations-dispatch {--limit=50 : Máximo de mensajes a procesar}';

    protected $description = 'Procesa mensajes de integración pendientes con reintentos e idempotencia';

    public function handle(IntegrationHubService $hub): int
    {
        $limit = max(1, min(200, (int) $this->option('limit')));
        $summary = $hub->dispatchDue($limit);
        $this->info("Procesados: {$summary['processed']}; reconocidos: {$summary['acknowledged']}; fallidos: {$summary['failed']}; cuarentena: {$summary['quarantined']}.");

        return self::SUCCESS;
    }
}
