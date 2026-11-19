<?php

return [
    // Local bridge only. Ricardo must select the deployed identity/scheduler setup.
    'enabled' => env('MES_LOCAL_SWITCH_ENABLED', in_array(env('APP_ENV'), ['local', 'sandbox'], true)),
    'primary_url' => env('MES_PRIMARY_URL', 'http://127.0.0.1:8013'),
    'sandbox_url' => env('MES_SANDBOX_URL', 'http://localhost:8015'),
    'directory' => base_path('.local/environment-switch'),
    'ttl' => 90,
];
