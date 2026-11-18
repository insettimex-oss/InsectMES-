<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class RequisitionValidator
{
    /** @param array<string,mixed> $before
     * @param  array<string,mixed>  $after
     */
    public function validate(User $user, array $before, array $after): void
    {
        $old = $before['requisitions31'] ?? [];
        $rows = $after['requisitions31'] ?? [];
        if ($old === $rows) {
            return;
        }
        abort_unless(app(RoleScreenAccess::class)->allows($user, 'requisitions'), 403);
        Validator::make(['rows' => $rows], [
            'rows' => ['present', 'array', 'max:5000'],
            'rows.*.id' => ['required', 'string', 'max:64', 'distinct'],
            'rows.*.code' => ['required', 'string', 'regex:/^REQ-[0-9]{6,}$/', 'distinct'],
            'rows.*.date' => ['required', 'date_format:Y-m-d'],
            'rows.*.requester' => ['required', 'string', 'max:120'],
            'rows.*.reference' => ['present', 'nullable', 'string', 'max:500'],
            'rows.*.lines' => ['required', 'array', 'min:1', 'max:500'],
            'rows.*.lines.*.id' => ['required', 'string', 'max:64'],
            'rows.*.lines.*.description' => ['required', 'string', 'max:500'],
            'rows.*.lines.*.quantity' => ['present', 'nullable', 'string', 'max:80'],
            'rows.*.lines.*.unit' => ['present', 'nullable', 'string', 'max:80'],
            'rows.*.lines.*.notes' => ['present', 'nullable', 'string', 'max:1000'],
            'rows.*.lines.*.purchased' => ['required', 'boolean'],
        ])->validate();
        $previous = array_column($old, null, 'id');
        $remaining = array_fill_keys(array_column($rows, 'id'), true);
        foreach ($old as $row) {
            if (! isset($remaining[$row['id']])) {
                throw ValidationException::withMessages(['state' => 'No se puede eliminar una requisición completa. Edite sus partidas.']);
            }
        }
        $next = 1;
        foreach ($old as $row) {
            $next = max($next, (int) substr($row['code'], 4) + 1);
        }
        foreach ($rows as $row) {
            $prior = $previous[$row['id']] ?? null;
            if ($prior === $row) {
                continue;
            }
            if (! $prior) {
                abort_unless($user->hasPermission('requisitions.write'), 403);
                if ($row['code'] !== 'REQ-'.str_pad((string) $next++, 6, '0', STR_PAD_LEFT)) {
                    throw ValidationException::withMessages(['state' => 'El consecutivo cambió. Recargue antes de guardar.']);
                }
            } elseif ($prior['code'] !== $row['code']) {
                throw ValidationException::withMessages(['state' => 'El consecutivo no se puede modificar.']);
            }
            $oldLines = array_column($prior['lines'] ?? [], null, 'id');
            $ids = array_column($row['lines'], 'id');
            if (count($ids) !== count(array_unique($ids))) {
                throw ValidationException::withMessages(['state' => 'Las partidas deben tener identificadores distintos.']);
            }
            $metadata = $row;
            unset($metadata['lines']);
            $priorMetadata = $prior ?? [];
            unset($priorMetadata['lines']);
            if ($metadata !== $priorMetadata || count($oldLines) !== count($row['lines'])) {
                abort_unless($user->hasPermission('requisitions.write'), 403);
            }
            foreach ($row['lines'] as $line) {
                $oldLine = $oldLines[$line['id']] ?? null;
                if (($line['purchased'] ?? false) !== ($oldLine['purchased'] ?? false)) {
                    abort_unless($user->hasPermission('requisitions.approve'), 403, 'Su rol no permite marcar compras realizadas.');
                }
                $content = $line;
                unset($content['purchased']);
                $oldContent = $oldLine ?? [];
                unset($oldContent['purchased']);
                if ($content !== $oldContent) {
                    abort_unless($user->hasPermission('requisitions.write'), 403);
                }
                unset($oldLines[$line['id']]);
            }
            foreach ($oldLines as $deleted) {
                if ($deleted['purchased']) {
                    abort_unless($user->hasPermission('requisitions.approve'), 403);
                }
            }
        }
    }
}
