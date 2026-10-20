<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use PDO;
use Throwable;

class MesBackupCommand extends Command
{
    protected $signature = 'mes:backup {--prune=14 : Días de respaldos a conservar}';

    protected $description = 'Crea y verifica un respaldo consistente de la base SQLite de InsectMES';

    public function handle(): int
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            $this->error('Este comando está diseñado para la instalación SQLite local.');

            return self::FAILURE;
        }

        $source = (string) config('database.connections.sqlite.database');
        $directory = storage_path('app/private/backups');
        $started = now();
        $runId = DB::table('backup_runs')->insertGetId([
            'status' => 'RUNNING', 'started_at' => $started, 'created_at' => $started, 'updated_at' => $started,
        ]);

        try {
            abort_unless(is_file($source), 500, 'No se encontró la base SQLite.');
            if (! is_dir($directory)) {
                mkdir($directory, 0750, true);
            }

            DB::statement('PRAGMA wal_checkpoint(FULL)');
            $path = $directory.DIRECTORY_SEPARATOR.'insectmes-'.$started->format('Ymd-His').'.sqlite';
            if (! copy($source, $path)) {
                throw new \RuntimeException('No fue posible copiar la base de datos.');
            }

            $pdo = new PDO('sqlite:'.$path);
            $statement = $pdo->query('PRAGMA integrity_check');
            if ($statement === false) {
                throw new \RuntimeException('No fue posible ejecutar la verificación de integridad.');
            }
            $integrity = $statement->fetchColumn();
            if ($integrity !== 'ok') {
                throw new \RuntimeException('La verificación de integridad falló: '.$integrity);
            }

            DB::table('backup_runs')->where('id', $runId)->update([
                'status' => 'COMPLETED', 'path' => $path, 'checksum' => hash_file('sha256', $path),
                'size_bytes' => filesize($path), 'restore_verified' => true, 'completed_at' => now(), 'updated_at' => now(),
            ]);
            $this->prune($directory, max((int) $this->option('prune'), 1));
            $this->info("Respaldo verificado: {$path}");

            return self::SUCCESS;
        } catch (Throwable $exception) {
            DB::table('backup_runs')->where('id', $runId)->update([
                'status' => 'FAILED', 'error' => $exception->getMessage(), 'completed_at' => now(), 'updated_at' => now(),
            ]);
            $this->error($exception->getMessage());

            return self::FAILURE;
        }
    }

    private function prune(string $directory, int $days): void
    {
        $cutoff = now()->subDays($days)->getTimestamp();
        foreach (glob($directory.DIRECTORY_SEPARATOR.'insectmes-*.sqlite') ?: [] as $file) {
            if (filemtime($file) < $cutoff) {
                unlink($file);
            }
        }
    }
}
