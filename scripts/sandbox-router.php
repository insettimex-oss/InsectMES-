<?php

// Dedicated local entry point: separate database, files, sessions and cache.
$root = dirname(__DIR__);
$sandbox = $root.'/.local/sandbox';
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/');
if ($uri !== '/' && is_file($root.'/public'.$uri)) return false;
if (! is_file($sandbox.'/database.sqlite')) { http_response_code(503); echo 'Sandbox todavía no está preparado.'; return; }
$lock = fopen($sandbox.'/access.lock', 'c+');
if (! $lock || ! flock($lock, LOCK_SH | LOCK_NB)) { http_response_code(503); header('Retry-After: 10'); echo 'Sandbox se está actualizando. Vuelve a cargar en unos segundos.'; return; }
$environment = [
    'APP_ENV' => 'sandbox', 'APP_NAME' => 'InsectMES Sandbox', 'APP_URL' => 'http://localhost:8015',
    'DB_CONNECTION' => 'sqlite', 'DB_DATABASE' => $sandbox.'/database.sqlite', 'DB_URL' => '',
    'LARAVEL_STORAGE_PATH' => $sandbox.'/storage', 'SESSION_COOKIE' => 'insectmes_sandbox_session',
    'SESSION_DRIVER' => 'file', 'CACHE_STORE' => 'file', 'QUEUE_CONNECTION' => 'database', 'MAIL_MAILER' => 'log',
    'APP_CONFIG_CACHE' => $sandbox.'/cache/config.php', 'APP_ROUTES_CACHE' => $sandbox.'/cache/routes.php',
    'APP_EVENTS_CACHE' => $sandbox.'/cache/events.php',
];
foreach ($environment as $key => $value) { putenv($key.'='.$value); $_ENV[$key] = $value; $_SERVER[$key] = $value; }
try { require $root.'/public/index.php'; }
finally { flock($lock, LOCK_UN); fclose($lock); }
