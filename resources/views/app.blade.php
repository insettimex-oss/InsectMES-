<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-mes-environment="{{ app()->environment('sandbox') ? 'sandbox' : 'local' }}" data-primary-url="{{ config('environment-switch.primary_url') }}" data-sandbox-url="{{ config('environment-switch.sandbox_url') }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>

        {{-- Inline style to set the HTML background color based on our theme in app.css --}}
        <style>
            html {
                background-color: oklch(1 0 0);
            }

            html.dark {
                background-color: oklch(0.145 0 0);
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @if(auth()->check() && request()->is('dashboard', 'mes/*', 'settings/*'))
            @php($rev031Hash = json_decode(file_get_contents(resource_path('js/lib/rev031-build.json')), true)['hash'])
            <link id="rev031-style" rel="stylesheet" href="/rev031/assets/app.css?v={{ $rev031Hash }}">
            <link rel="preload" as="script" href="/rev031/assets/app.js?v={{ $rev031Hash }}">
        @endif
        <x-inertia::head>
            <title>{{ config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <x-inertia::app />
    </body>
</html>
