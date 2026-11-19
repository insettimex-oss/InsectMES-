<?php

namespace App\Services;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class InventoryWorkflowValidator
{
    /**
     * @param  array<string,mixed>  $before
     * @param  array<string,mixed>  $after
     */
    public function validate(array $before, array $after): void
    {
        $old = $before['inventoryTransactions36'] ?? [];
        $logs = $after['inventoryTransactions36'] ?? [];
        if ($logs === $old) {
            return;
        }
        Validator::make(['logs' => $logs], ['logs' => ['required', 'array', 'max:100000']])->validate();
        if (count($logs) !== count($old) + 1 || array_slice($logs, 1) !== $old) {
            $this->fail('No se permite sustituir el historial de movimientos.');
        }
        $tx = Validator::make($logs[0], [
            'id' => ['required', 'uuid'], 'action' => ['required', 'in:Move,Split,Merge'],
            'sources' => ['required', 'array', 'min:1', 'max:1000'], 'sources.*' => ['required', 'string', 'distinct'],
            'target' => ['nullable', 'string'], 'destination' => ['nullable', 'string'], 'at' => ['required', 'date'],
            'outputs' => ['required', 'array', 'min:1', 'max:1000'], 'outputs.*.serial' => ['required', 'string', 'distinct'],
            'outputs.*.quantity' => ['required', 'numeric', 'gt:0'],
        ])->validate();
        $oldRows = array_column($before['serials'], null, 'serial');
        $newRows = array_column($after['serials'], null, 'serial');
        $statuses = array_column($before['setupTables']['Container_Status'], null, 'code');
        $sources = [];
        foreach ($tx['sources'] as $code) {
            $row = $oldRows[$code] ?? null;
            $rule = $statuses[$row['status'] ?? ''] ?? [];
            if (! $row || ! $row['active'] || $row['qtyCurrent'] <= 0 || ($row['quarantined'] ?? false) || ($row['receiptPending30'] ?? false) || ($rule['receivingStatus'] ?? false) || ! ($rule['activeStatus'] ?? true)) {
                $this->fail('Hay contenedores no disponibles para el movimiento.');
            }
            if (($tx['action'] === 'Move' && ! ($rule['allowMove'] ?? false)) || ($tx['action'] === 'Split' && ($rule['preventSplit'] ?? false)) || ($tx['action'] === 'Merge' && ($rule['preventMerge'] ?? false))) {
                $this->fail('El estatus no permite el movimiento.');
            }
            $sources[$code] = $row;
        }
        $outputCodes = array_column($tx['outputs'], 'serial');
        foreach ($tx['outputs'] as $output) {
            $row = $newRows[$output['serial']] ?? null;
            if (! $row || abs($row['qtyCurrent'] - $output['quantity']) > 1e-6) {
                $this->fail('La cantidad registrada no coincide con el resultado.');
            }
        }
        if ($tx['action'] === 'Move') {
            $destination = null;
            foreach ($before['setupTables']['Locations'] as $location) {
                if ($location['code'] === ($tx['destination'] ?? '')) {
                    $destination = $location;
                }
            }
            if (! $destination || ! $destination['active'] || $outputCodes !== array_keys($sources)) {
                $this->fail('Destino o selección de Move inválidos.');
            }
            foreach ($sources as $code => $oldRow) {
                $expected = $oldRow;
                $expected['location'] = $tx['destination'];
                if ($this->canonical($expected) !== $this->canonical($newRows[$code])) {
                    $this->fail('Move sólo puede cambiar la ubicación de los seriales seleccionados.');
                }
            }
        } else {
            $target = $tx['target'] ?? '';
            if (! isset($sources[$target])) {
                $this->fail('El serial conservado debe formar parte de la selección.');
            }
            $first = $sources[$target];
            $total = 0;
            foreach ($sources as $source) {
                if ($source['part'] !== $first['part']) {
                    $this->fail('Merge requiere el mismo No Parte.');
                }$total += $this->convert($source['qtyCurrent'], $source['unit'], $first['unit'], $before);
            }
            $sum = 0;
            foreach ($outputCodes as $code) {
                $row = $newRows[$code];
                if (! $row['active'] || $row['qtyCurrent'] <= 0 || $row['part'] !== $first['part'] || $row['unit'] !== $first['unit'] || $row['location'] !== $first['location']) {
                    $this->fail('La división o unión no puede cambiar parte, unidad o ubicación.');
                }$sum += $row['qtyCurrent'];
            }
            if (abs($sum - $total) > max(1e-6, $total * 1e-9)) {
                $this->fail('El movimiento debe conservar la cantidad total.');
            }
            if ($tx['action'] === 'Split') {
                if (count($sources) !== 1 || count($outputCodes) < 2 || $outputCodes[0] !== $target) {
                    $this->fail('Split conserva el original y requiere al menos dos divisiones.');
                }
                foreach (array_slice($outputCodes, 1) as $code) {
                    if (isset($oldRows[$code])) {
                        $this->fail('Cada división adicional requiere un serial nuevo.');
                    }
                }
            } else {
                if (count($sources) < 2 || $outputCodes !== [$target]) {
                    $this->fail('Merge debe conservar un único serial seleccionado.');
                }
                $lots = [];
                foreach ($sources as $source) {
                    foreach ($source['productionLots'] ?? [$source['productionLot'] ?? $source['lot'] ?? ''] as $lot) {
                        if ($lot !== '') {
                            $lots[$lot] = true;
                        }
                    }
                }
                if (count($lots) > 1 && ! ($before['settings']['allowMixedLotsMerge'] ?? false)) {
                    $this->fail('La configuración no permite mezclar lotes.');
                }
                foreach ($sources as $code => $source) {
                    if ($code !== $target && ($newRows[$code]['active'] || abs($newRows[$code]['qtyCurrent']) > 1e-6)) {
                        $this->fail('Los seriales absorbidos deben quedar inactivos y sin saldo.');
                    }
                }
            }
        }
        $affected = array_fill_keys([...array_keys($sources), ...$outputCodes], true);
        foreach ($newRows as $code => $row) {
            if (! isset($affected[$code]) && (! isset($oldRows[$code]) || $this->canonical($oldRows[$code]) !== $this->canonical($row))) {
                $this->fail('El movimiento no puede modificar otros contenedores.');
            }
        }
    }

    /** @param array<string,mixed> $state */
    private function convert(float $value, string $from, string $to, array $state): float
    {
        if (strcasecmp($from, $to) === 0) {
            return $value;
        }
        foreach ([['g' => 1, 'kg' => 1000, 'mg' => .001], ['ml' => 1, 'l' => 1000]] as $units) {
            if (isset($units[strtolower($from)],$units[strtolower($to)])) {
                return $value * $units[strtolower($from)] / $units[strtolower($to)];
            }
        }
        foreach ($state['unitConversions30'] ?? [] as $row) {
            if ($row['from'] === $from && $row['to'] === $to) {
                return $value * $row['factor'];
            }if ($row['from'] === $to && $row['to'] === $from && $row['factor'] > 0) {
                return $value / $row['factor'];
            }
        }
        $this->fail('No existe una conversión compatible entre las unidades.');
    }

    /** @param array<string,mixed> $row */
    private function canonical(array $row): string
    {
        array_walk_recursive($row, static function (&$value): void {
            if ($value === '') {
                $value = null;
            }
        });

        return json_encode($row, JSON_THROW_ON_ERROR);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['state' => $message]);
    }
}
