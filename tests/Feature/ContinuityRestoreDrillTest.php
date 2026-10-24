<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ContinuityRestoreDrillTest extends TestCase
{
    private string $databasePath;

    /** @var list<string> */
    private array $backupPaths = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->databasePath = storage_path('framework/testing/continuity-'.uniqid().'.sqlite');
        touch($this->databasePath);
        config()->set('database.connections.sqlite.database', $this->databasePath);
        DB::purge('sqlite');
        Artisan::call('migrate:fresh', ['--force' => true]);
    }

    protected function tearDown(): void
    {
        foreach ($this->backupPaths as $path) {
            if (is_file($path)) {
                unlink($path);
            }
        }
        DB::disconnect('sqlite');
        if (isset($this->databasePath) && is_file($this->databasePath)) {
            unlink($this->databasePath);
        }
        parent::tearDown();
    }

    public function test_backup_and_restore_are_verified_as_separate_controls(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(0, Artisan::call('mes:backup', ['--prune' => 1]));
        $backupId = (int) DB::table('backup_runs')->latest('id')->value('id');
        $this->backupPaths[] = (string) DB::table('backup_runs')->where('id', $backupId)->value('path');
        $this->assertDatabaseHas('backup_runs', [
            'id' => $backupId,
            'status' => 'COMPLETED',
            'driver' => 'sqlite',
            'integrity_verified' => true,
            'restore_verified' => false,
        ]);

        $this->assertSame(0, Artisan::call('mes:restore-drill', ['backup' => $backupId, '--rto' => 300]));
        $this->assertDatabaseHas('restore_drills', [
            'backup_run_id' => $backupId,
            'status' => 'COMPLETED',
            'checksum_verified' => true,
            'integrity_verified' => true,
        ]);
        $this->assertDatabaseHas('backup_runs', ['id' => $backupId, 'restore_verified' => true]);
        $this->assertNotNull(DB::table('backup_runs')->where('id', $backupId)->value('restore_verified_at'));
    }
}
