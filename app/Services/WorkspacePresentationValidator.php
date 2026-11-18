<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class WorkspacePresentationValidator
{
    /**
     * @param  array<string,mixed>  $before
     * @param  array<string,mixed>  $after
     */
    public function validate(User $user, array $before, array $after): void
    {
        if (($before['glossary36'] ?? []) !== ($after['glossary36'] ?? [])) {
            abort_unless($user->hasPermission('administration.write'), 403);
            Validator::make(['glossary' => $after['glossary36'] ?? []], ['glossary' => ['array', 'max:200'], 'glossary.*' => ['array', 'max:500'], 'glossary.*.*' => ['required', 'string', 'max:80']])->validate();
        }
        $old = $before['labelPrints30'] ?? [];
        $logs = $after['labelPrints30'] ?? [];
        if ($old === $logs) {
            return;
        }
        Validator::make(['logs' => $logs], ['logs' => ['required', 'array', 'max:100000']])->validate();
        abort_unless($user->hasPermission('inventory.read') || $user->hasPermission('production.read'), 403);
        if (count($logs) !== count($old) + 1 || array_slice($logs, 1) !== $old) {
            throw ValidationException::withMessages(['state' => 'El historial de etiquetas sólo admite agregar impresiones.']);
        }
        Validator::make($logs[0], ['date' => ['required', 'date'], 'serials' => ['required', 'array', 'min:1', 'max:1000'], 'serials.*' => ['required', 'string', 'distinct'], 'labels' => ['required', 'array', 'min:1'], 'labels.*' => ['required', 'string']])->validate();
        if (count($logs[0]['serials']) !== count($logs[0]['labels'])) {
            throw ValidationException::withMessages(['state' => 'Cada serial debe tener su etiqueta.']);
        }
        $serials = array_column($after['serials'], null, 'serial');
        $labels = array_column($after['labels30']['templates'] ?? [], null, 'code');
        foreach ($logs[0]['serials'] as $i => $code) {
            if (! isset($serials[$code]) || ! ($labels[$logs[0]['labels'][$i]]['active'] ?? false)) {
                throw ValidationException::withMessages(['state' => 'La impresión requiere seriales y etiquetas activas existentes.']);
            }
        }
    }
}
