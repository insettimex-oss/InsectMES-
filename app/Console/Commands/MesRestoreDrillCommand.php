<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PDO;
use RuntimeException;
use Throwable;

class MesRestoreDrillCommand extends Command
{
    protected $signature = 'mes:restore-drill {backup? : ID del respaldo; usa el último completado si se omite} {--user= : Usuario que ejecuta el simulacro} {--rto=300 : Objetivo RTO en segundos}';

    protected $description = 'Restaura una copia aislada del último respaldo SQLite y registra evidencia del simulacro';

    public function handle(): int
    {
        if (DB::connection()->getDriverName() !== 'sqlite') {
            $this->error('El simulacro automatizado disponible requiere SQLite. PostgreSQL debe validarse en su infraestructura dedicada.');

            return self::FAILURE;
        }

        $query = DB::table('backup_runs')->where('status', 'COMPLETED')->where('driver', 'sqlite');
        $backupId = $this->argument('backup');
        $row = $backupId === null ? $query->latest('id')->first() : $query->where('id', (int) $backupId)->first();
        if ($row === null) {
            $this->error('No existe un respaldo SQLite completado para ejecutar el simulacro.');

            return self::FAILURE;
        }

        $backup = get_object_vars($row);
        $started = now();
        $startedClock = hrtime(true);
        $rto = max((int) $this->option('rto'), 1);
        $drillId = DB::table('restore_drills')->insertGetId([
            'backup_run_id' => (int) $backup['id'],
            'driver' => 'sqlite',
            'status' => 'RUNNING',
            'rto_target_seconds' => $rto,
            'performed_by' => $this->option('user') !== null ? (int) $this->option('user') : null,
            'started_at' => $started,
            'created_at' => $started,
            'updated_at' => $started,
        ]);
        $restoredPath = storage_path('app/private/restore-drills/restore-'.Str::uuid().'.sqlite');
        $pdo = null;

        try {
            $source = (string) ($backup['path'] ?? '');
            if (! is_file($source)) {
                throw new RuntimeException('El archivo del respaldo ya no está disponible.');
            }
            $directory = dirname($restoredPath);
            if (! is_dir($directory) && ! mkdir($directory, 0750, true) && ! is_dir($directory)) {
                throw new RuntimeException('No fue posible crear el área aislada de restauración.');
            }
            if (! copy($source, $restoredPath)) {
                throw new RuntimeException('No fue posible restaurar la copia en el área aislada.');
            }

            $expectedChecksum = (string) ($backup['checksum'] ?? '');
            $checksumVerified = $expectedChecksum !== '' && hash_equals($expectedChecksum, (string) hash_file('sha256', $restoredPath));
            if (! $checksumVerified) {
                throw new RuntimeException('La copia restaurada no conserva el checksum del respaldo.');
            }

            $pdo = new PDO('sqlite:'.$restoredPath);
            $integrityStatement = $pdo->query('PRAGMA integrity_check');
            if ($integrityStatement === false) {
                throw new RuntimeException('No fue posible ejecutar integrity_check sobre la base restaurada.');
            }
            $integrity = $integrityStatement->fetchColumn();
            if ($integrity !== 'ok') {
                throw new RuntimeException('La base restaurada no superó integrity_check.');
            }
            $tablesStatement = $pdo->query("SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
            if ($tablesStatement === false) {
                throw new RuntimeException('No fue posible inspeccionar las tablas restauradas.');
            }
            $tableCount = (int) $tablesStatement->fetchColumn();
            if ($tableCount < 1) {
                throw new RuntimeException('La base restaurada no contiene tablas de aplicación.');
            }

            $duration = max(0, (int) ceil((hrtime(true) - $startedClock) / 1_000_000_000));
            DB::transaction(function () use ($drillId, $backup, $duration, $tableCount): void {
                DB::table('restore_drills')->where('id', $drillId)->update([
                    'status' => 'COMPLETED',
                    'duration_seconds' => $duration,
                    'table_count' => $tableCount,
                    'checksum_verified' => true,
                    'integrity_verified' => true,
                    'completed_at' => now(),
                    'updated_at' => now(),
                ]);
                DB::table('backup_runs')->where('id', (int) $backup['id'])->update([
                    'restore_verified' => true,
                    'restore_verified_at' => now(),
                    'updated_at' => now(),
                ]);
            });
            $this->info("Restauración aislada verificada en {$duration} s; {$tableCount} tablas detectadas.");

            return self::SUCCESS;
        } catch (Throwable $exception) {
            DB::table('restore_drills')->where('id', $drillId)->update([
                'status' => 'FAILED',
                'duration_seconds' => max(0, (int) ceil((hrtime(true) - $startedClock) / 1_000_000_000)),
                'error' => $exception->getMessage(),
                'completed_at' => now(),
                'updated_at' => now(),
            ]);
            $this->error($exception->getMessage());

            return self::FAILURE;
        } finally {
            unset($integrityStatement, $tablesStatement, $pdo);
            if (is_file($restoredPath)) {
                unlink($restoredPath);
            }
        }
    }
}
