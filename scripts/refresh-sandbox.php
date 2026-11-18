<?php

// Consistent SQLite snapshot; the source database is never replaced or migrated.
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
date_default_timezone_set('America/Mexico_City');
$root = dirname(__DIR__);
$source = $root.'/database/database.sqlite';
$directory = $root.'/.local/sandbox';
if (! is_file($source)) throw new RuntimeException('No existe la base principal local.');
foreach (['', '/backups', '/storage/framework/sessions', '/storage/framework/views', '/storage/framework/cache/data', '/storage/logs', '/storage/app/private', '/storage/app/public', '/cache'] as $child) {
    if (! is_dir($directory.$child) && ! mkdir($directory.$child, 0700, true) && ! is_dir($directory.$child)) throw new RuntimeException('No se pudo preparar Sandbox.');
}
$lock = fopen($directory.'/access.lock', 'c+');
if (! $lock) throw new RuntimeException('No se pudo abrir el control de acceso de Sandbox.');
$locked = false;
$deadline = microtime(true) + 45;
do { $locked = flock($lock, LOCK_EX | LOCK_NB); if (! $locked) usleep(100000); } while (! $locked && microtime(true) < $deadline);
if (! $locked) throw new RuntimeException('Sandbox sigue ocupado. No se reemplazó ninguna base.');
$stamp = date('Ymd-His').'-'.bin2hex(random_bytes(3));
$temporary = $directory.'/snapshot-'.$stamp.'.sqlite';
$target = $directory.'/database.sqlite';
$backup = null;
try {
    $db = new PDO('sqlite:'.$source, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $db->exec('PRAGMA busy_timeout=15000');
    $db->exec('VACUUM INTO '.$db->quote($temporary));
    $db = null;
    $copy = new PDO('sqlite:'.$temporary, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    if ($copy->query('PRAGMA integrity_check')->fetchColumn() !== 'ok') throw new RuntimeException('La copia no pasó la revisión de integridad.');
    $exists = fn (string $table): bool => (bool) $copy->query("SELECT count(*) FROM sqlite_master WHERE type='table' AND name=".$copy->quote($table))->fetchColumn();
    $counts = [];
    foreach (['users', 'parts', 'containers', 'mes_settings'] as $table) if ($exists($table)) $counts[$table] = (int) $copy->query('SELECT count(*) FROM '.$table)->fetchColumn();
    // Fresh sessions and disabled connectors prevent carrying live execution into Sandbox.
    $copy->beginTransaction();
    if ($exists('integration_endpoints')) $copy->exec('UPDATE integration_endpoints SET active=0');
    foreach (['sessions', 'password_reset_tokens', 'jobs'] as $table) if ($exists($table)) $copy->exec('DELETE FROM '.$table);
    if ($exists('users')) $copy->exec('UPDATE users SET remember_token=NULL');
    if ($exists('mes_settings')) {
        $json = $copy->query("SELECT value FROM mes_settings WHERE key='rev031.workspace'")->fetchColumn();
        if ($json) {
            $workspace = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
            // Invalidate every pre-refresh browser snapshot, even if main and test had equal revisions.
            $workspace['revision'] = (int) floor(microtime(true) * 1000) * 1000 + random_int(0, 999);
            $update = $copy->prepare("UPDATE mes_settings SET value=? WHERE key='rev031.workspace'");
            $update->execute([json_encode($workspace, JSON_THROW_ON_ERROR)]);
            $update = null;
        }
    }
    $copy->commit();
    if ($copy->query('PRAGMA foreign_key_check')->fetch()) throw new RuntimeException('La copia tiene referencias inconsistentes.');
    $copy->exec('PRAGMA journal_mode=DELETE');
    unset($exists);
    $copy = null;
    if (is_file($target)) {
        $old = new PDO('sqlite:'.$target, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $old->exec('PRAGMA busy_timeout=5000');
        $old->exec('PRAGMA wal_checkpoint(TRUNCATE)');
        $old->exec('PRAGMA journal_mode=DELETE');
        $old = null;
        $backup = $directory.'/backups/sandbox-'.$stamp.'.sqlite';
        if (! rename($target, $backup)) throw new RuntimeException('No se pudo conservar el Sandbox anterior.');
    }
    if (! rename($temporary, $target)) {
        if ($backup && ! is_file($target)) rename($backup, $target);
        throw new RuntimeException('No se pudo activar la copia nueva; se conservó la anterior.');
    }
    $status = ['environment' => 'sandbox', 'source' => 'database/database.sqlite', 'refreshedAt' => date(DATE_ATOM), 'timezone' => date_default_timezone_get(), 'integrity' => 'ok', 'rows' => $counts, 'previousSandbox' => $backup ? basename($backup) : null, 'externalConnectors' => 'disabled'];
    file_put_contents($directory.'/status.json', json_encode($status, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));
    echo 'Sandbox actualizado: '.date('Y-m-d H:i:s').' America/Mexico_City. Integridad correcta. Principal intacto.'.PHP_EOL;
} finally {
    flock($lock, LOCK_UN);
    fclose($lock);
}
