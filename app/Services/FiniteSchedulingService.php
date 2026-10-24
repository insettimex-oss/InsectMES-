<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class FiniteSchedulingService
{
    /** @return array{run_id: int, orders: int, operations: int, campaigns: int, changeover_minutes: int, alternate_centers_used: int, late: int, unscheduled: int, material_shortages: int, biological_violations: int} */
    public function run(Carbon $horizonStart, Carbon $horizonEnd, ?int $userId, ?string $notes): array
    {
        if ($horizonEnd->lte($horizonStart)) {
            throw ValidationException::withMessages(['horizon_end' => 'El horizonte debe terminar después del inicio.']);
        }

        $capacities = $this->capacities();
        if ($capacities->isEmpty()) {
            throw ValidationException::withMessages(['capacity' => 'No existen turnos con capacidad activa.']);
        }

        $biologicalRules = $this->biologicalRules();
        $changeoverRules = $this->changeoverRules();
        $workCenterOptions = $this->workCenterOptions($horizonStart, $horizonEnd);
        $parallelCapacities = DB::table('work_centers')->pluck('parallel_capacity', 'id');
        $materialPools = $this->materialPools($horizonStart, $horizonEnd);

        return DB::transaction(function () use ($horizonStart, $horizonEnd, $userId, $notes, $capacities, $biologicalRules, $changeoverRules, $workCenterOptions, $parallelCapacities, $materialPools): array {
            DB::table('planning_runs')->where('status', 'CURRENT')->update(['status' => 'SUPERSEDED', 'updated_at' => now()]);
            $runId = DB::table('planning_runs')->insertGetId([
                'status' => 'RUNNING',
                'horizon_start' => $horizonStart,
                'horizon_end' => $horizonEnd,
                'created_by' => $userId,
                'notes' => $notes,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $orders = DB::table('production_orders as p')
                ->leftJoin('production_campaigns as c', 'c.id', '=', 'p.campaign_id')
                ->whereIn('p.status', ['PLANNED', 'RELEASED'])
                ->orderByRaw("CASE p.priority WHEN 'CRITICAL' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END")
                ->orderByRaw('CASE WHEN c.priority IS NULL THEN 999 ELSE c.priority END')
                ->orderBy('c.family')->orderBy('p.scheduled_end')->orderBy('p.scheduled_start')
                ->get(['p.*', 'c.family as campaign_family', 'c.priority as campaign_priority']);

            /** @var array<string, Carbon> $usedUntil */
            $usedUntil = [];
            /** @var array<int, list<array{start: Carbon, end: Carbon}>> $occupancies */
            $occupancies = [];
            /** @var array<int, string> $lastFamily */
            $lastFamily = [];
            $scheduledCampaigns = [];
            $scheduledOperations = 0;
            $unscheduled = 0;
            $late = 0;
            $changeoverMinutes = 0;
            $alternateCentersUsed = 0;
            $materialShortages = 0;
            $biologicalViolations = 0;

            foreach ($orders as $orderRow) {
                $order = get_object_vars($orderRow);
                $orderId = (int) $order['id'];
                $partId = (int) $order['part_id'];
                $campaignId = $order['campaign_id'] === null ? null : (int) $order['campaign_id'];
                $campaignFamily = $order['campaign_family'] === null ? null : (string) $order['campaign_family'];
                $anchor = Carbon::parse((string) $order['scheduled_start']);
                $earliest = $anchor->copy()->max($horizonStart->copy());
                $operations = DB::table('production_order_operations as po')
                    ->join('operations as o', 'o.id', '=', 'po.operation_id')
                    ->where('po.production_order_id', $orderId)
                    ->whereNotIn('po.status', ['IN_PROGRESS', 'COMPLETED'])
                    ->orderBy('po.sequence')
                    ->get(['po.id', 'po.operation_id', 'o.work_center_id', 'o.duration_hours', 'o.scheduling_mode']);

                if ($operations->isEmpty()) {
                    continue;
                }

                $proposedPools = $materialPools;
                $reservation = $this->reserveMaterials($orderId, $earliest, $horizonEnd, $proposedPools);
                if ($reservation === null) {
                    $this->markUnscheduled($operations, 'MATERIAL_SHORTAGE');
                    $unscheduled += $operations->count();
                    $materialShortages++;

                    continue;
                }

                $earliest = $reservation['ready_at'];
                $proposedUsedUntil = $usedUntil;
                $proposedOccupancies = $occupancies;
                $proposedLastFamily = $lastFamily;
                $plans = [];
                $failure = null;

                foreach ($operations as $operationRow) {
                    $operation = get_object_vars($operationRow);
                    $operationId = (int) $operation['operation_id'];
                    $orderOperationId = (int) $operation['id'];
                    $primaryCenterId = (int) ($operation['work_center_id'] ?? 0);
                    $baseDurationMinutes = max(1, (int) ceil((float) ($operation['duration_hours'] ?? 1) * 60));
                    $mode = strtoupper((string) ($operation['scheduling_mode'] ?? 'ACTIVE'));

                    $operationEarliest = $earliest->copy();
                    $biologicalRule = $biologicalRules[$partId.'-'.$operationId] ?? null;
                    $latestStart = null;
                    if ($biologicalRule !== null) {
                        $operationEarliest = $operationEarliest->max(
                            $anchor->copy()->addMinutes((int) round((float) $biologicalRule['minimum_age_hours'] * 60)),
                        );
                        $latestStart = $anchor->copy()->addMinutes((int) round((float) $biologicalRule['maximum_age_hours'] * 60));
                    }

                    $candidates = [[
                        'center_id' => $primaryCenterId,
                        'priority' => 0,
                        'efficiency_factor' => 1.0,
                        'valid_from' => null,
                        'valid_to' => null,
                        'primary' => true,
                    ], ...($workCenterOptions[$operationId] ?? [])];
                    $candidatePlans = [];
                    $candidateFailures = [];

                    foreach ($candidates as $candidate) {
                        $centerId = (int) $candidate['center_id'];
                        if ($centerId === 0 || ! $capacities->has($centerId)) {
                            $candidateFailures[] = 'CAPACITY_NOT_CONFIGURED';

                            continue;
                        }

                        $candidateEarliest = $operationEarliest->copy();
                        if ($candidate['valid_from'] !== null) {
                            $candidateEarliest = $candidateEarliest->max(Carbon::parse((string) $candidate['valid_from']));
                        }
                        $candidateUsedUntil = $proposedUsedUntil;
                        $candidateOccupancies = $proposedOccupancies;
                        $candidateLastFamily = $proposedLastFamily;
                        $durationMinutes = max(1, (int) ceil($baseDurationMinutes / max(0.1, (float) $candidate['efficiency_factor'])));
                        $setupSegments = [];

                        if ($campaignFamily !== null && isset($candidateLastFamily[$centerId]) && $candidateLastFamily[$centerId] !== $campaignFamily) {
                            $changeover = $this->findChangeoverRule($changeoverRules, $centerId, $candidateLastFamily[$centerId], $campaignFamily);
                            if ($changeover !== null && (int) $changeover['setup_minutes'] > 0) {
                                $setupSegments = $this->allocate($capacities->get($centerId), $centerId, $candidateEarliest, $horizonEnd, (int) $changeover['setup_minutes'], $candidateUsedUntil);
                                if ($setupSegments === []) {
                                    $candidateFailures[] = 'CHANGEOVER_CAPACITY';

                                    continue;
                                }
                                $candidateEarliest = $setupSegments[array_key_last($setupSegments)]['end']->copy();
                            }
                        }

                        $runSegments = [];
                        $dwell = null;
                        if ($mode === 'DWELL') {
                            $dwell = $this->allocateDwell($centerId, $candidateEarliest, $horizonEnd, $durationMinutes, max(1, (int) ($parallelCapacities[$centerId] ?? 1)), $candidateOccupancies);
                            if ($dwell === null) {
                                $candidateFailures[] = 'BIOLOGICAL_CAPACITY';

                                continue;
                            }
                            $plannedStart = $dwell['start'];
                            $plannedEnd = $dwell['end'];
                        } else {
                            $runSegments = $this->allocate($capacities->get($centerId), $centerId, $candidateEarliest, $horizonEnd, $durationMinutes, $candidateUsedUntil);
                            if ($runSegments === []) {
                                $candidateFailures[] = 'FINITE_CAPACITY';

                                continue;
                            }
                            $plannedStart = $runSegments[0]['start'];
                            $plannedEnd = $runSegments[array_key_last($runSegments)]['end'];
                        }

                        if ($latestStart !== null && $plannedStart->gt($latestStart)) {
                            $candidateFailures[] = 'BIOLOGICAL_WINDOW';

                            continue;
                        }
                        if ($candidate['valid_to'] !== null && $plannedEnd->gt(Carbon::parse((string) $candidate['valid_to']))) {
                            $candidateFailures[] = 'ALTERNATE_VALIDITY';

                            continue;
                        }
                        if ($campaignFamily !== null) {
                            $candidateLastFamily[$centerId] = $campaignFamily;
                        }

                        $candidatePlans[] = [
                            'operation_id' => $orderOperationId,
                            'center_id' => $centerId,
                            'primary_center_id' => $primaryCenterId,
                            'primary' => (bool) $candidate['primary'],
                            'mode' => $mode === 'DWELL' ? 'DWELL' : 'ACTIVE',
                            'duration' => $durationMinutes,
                            'setup' => $setupSegments,
                            'run' => $runSegments,
                            'dwell' => $dwell,
                            'planned_start' => $plannedStart,
                            'planned_end' => $plannedEnd,
                            'priority' => (int) $candidate['priority'],
                            'used_until' => $candidateUsedUntil,
                            'occupancies' => $candidateOccupancies,
                            'last_family' => $candidateLastFamily,
                        ];
                    }

                    if ($candidatePlans === []) {
                        $failure = in_array('BIOLOGICAL_WINDOW', $candidateFailures, true)
                            ? 'BIOLOGICAL_WINDOW'
                            : ($candidateFailures[0] ?? 'CAPACITY_NOT_CONFIGURED');
                        break;
                    }
                    usort($candidatePlans, fn (array $left, array $right): int => [
                        $left['planned_end']->getTimestamp(), $left['priority'], $left['center_id'],
                    ] <=> [
                        $right['planned_end']->getTimestamp(), $right['priority'], $right['center_id'],
                    ]);
                    $selected = $candidatePlans[0];
                    $proposedUsedUntil = $selected['used_until'];
                    $proposedOccupancies = $selected['occupancies'];
                    $proposedLastFamily = $selected['last_family'];
                    $earliest = $selected['planned_end']->copy();
                    unset($selected['used_until'], $selected['occupancies'], $selected['last_family'], $selected['priority']);
                    $plans[] = $selected;
                }

                if ($failure !== null) {
                    $this->markUnscheduled($operations, $failure);
                    $unscheduled += $operations->count();
                    if (str_starts_with($failure, 'BIOLOGICAL')) {
                        $biologicalViolations++;
                    }

                    continue;
                }

                $usedUntil = $proposedUsedUntil;
                $occupancies = $proposedOccupancies;
                $lastFamily = $proposedLastFamily;
                $materialPools = $proposedPools;
                if ($campaignId !== null) {
                    $scheduledCampaigns[$campaignId] = true;
                }

                foreach ($reservation['allocations'] as $allocation) {
                    DB::table('planning_material_allocations')->insert([
                        'planning_run_id' => $runId,
                        'production_order_id' => $orderId,
                        'part_id' => $allocation['part_id'],
                        'material_supply_event_id' => $allocation['event_id'],
                        'source' => $allocation['source'],
                        'quantity' => $allocation['quantity'],
                        'available_at' => $allocation['available_at'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                foreach ($plans as $plan) {
                    if (! $plan['primary']) {
                        $alternateCentersUsed++;
                    }
                    $sequence = 1;
                    $plannedStart = $plan['planned_start'];
                    $plannedEnd = $plan['planned_end'];
                    foreach ($plan['setup'] as $segment) {
                        DB::table('production_schedule_segments')->insert([
                            'planning_run_id' => $runId,
                            'production_order_operation_id' => $plan['operation_id'],
                            'work_center_id' => $plan['center_id'],
                            'shift_id' => $segment['shift_id'],
                            'campaign_id' => $campaignId,
                            'segment_sequence' => $sequence++,
                            'segment_type' => 'CHANGEOVER',
                            'planned_start' => $segment['start'],
                            'planned_end' => $segment['end'],
                            'planned_minutes' => $segment['minutes'],
                            'notes' => 'Cambio de campaña '.$campaignFamily,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                        $changeoverMinutes += $segment['minutes'];
                    }

                    if ($plan['mode'] === 'DWELL') {
                        $dwell = $plan['dwell'];
                        DB::table('biological_schedule_occupancies')->insert([
                            'planning_run_id' => $runId,
                            'production_order_operation_id' => $plan['operation_id'],
                            'work_center_id' => $plan['center_id'],
                            'campaign_id' => $campaignId,
                            'planned_start' => $dwell['start'],
                            'planned_end' => $dwell['end'],
                            'capacity_units' => 1,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]);
                    } else {
                        foreach ($plan['run'] as $segment) {
                            DB::table('production_schedule_segments')->insert([
                                'planning_run_id' => $runId,
                                'production_order_operation_id' => $plan['operation_id'],
                                'work_center_id' => $plan['center_id'],
                                'shift_id' => $segment['shift_id'],
                                'campaign_id' => $campaignId,
                                'segment_sequence' => $sequence++,
                                'segment_type' => 'RUN',
                                'planned_start' => $segment['start'],
                                'planned_end' => $segment['end'],
                                'planned_minutes' => $segment['minutes'],
                                'created_at' => now(),
                                'updated_at' => now(),
                            ]);
                        }
                    }

                    DB::table('production_order_operations')->where('id', $plan['operation_id'])->update([
                        'planned_start' => $plannedStart,
                        'planned_end' => $plannedEnd,
                        'planned_minutes' => $plan['duration'],
                        'schedule_status' => 'SCHEDULED',
                        'schedule_reason' => null,
                        'planned_work_center_id' => $plan['center_id'],
                        'work_center_selection' => $plan['primary'] ? 'PRIMARY' : 'ALTERNATE_APPROVED',
                        'updated_at' => now(),
                    ]);
                    $scheduledOperations++;
                }

                $due = $order['scheduled_end'] !== null ? Carbon::parse((string) $order['scheduled_end']) : null;
                if ($due !== null && $earliest->gt($due)) {
                    $late++;
                }
            }

            $result = [
                'run_id' => $runId,
                'orders' => $orders->count(),
                'operations' => $scheduledOperations,
                'campaigns' => count($scheduledCampaigns),
                'changeover_minutes' => $changeoverMinutes,
                'alternate_centers_used' => $alternateCentersUsed,
                'late' => $late,
                'unscheduled' => $unscheduled,
                'material_shortages' => $materialShortages,
                'biological_violations' => $biologicalViolations,
            ];

            DB::table('planning_runs')->where('id', $runId)->update([
                'status' => 'CURRENT',
                'orders_scheduled' => $orders->count(),
                'operations_scheduled' => $scheduledOperations,
                'campaigns_scheduled' => count($scheduledCampaigns),
                'changeover_minutes' => $changeoverMinutes,
                'alternate_centers_used' => $alternateCentersUsed,
                'late_orders' => $late,
                'unscheduled_operations' => $unscheduled,
                'material_shortages' => $materialShortages,
                'biological_violations' => $biologicalViolations,
                'completed_at' => now(),
                'updated_at' => now(),
            ]);

            return $result;
        });
    }

    /** @return Collection<int|string, Collection<int, \stdClass>> */
    private function capacities(): Collection
    {
        return DB::table('work_center_shift_capacities as c')
            ->join('shifts as s', 's.id', '=', 'c.shift_id')
            ->where('c.active', true)->where('s.active', true)
            ->orderBy('s.starts_at')
            ->get(['c.work_center_id', 'c.shift_id', 'c.available_minutes', 's.starts_at', 's.ends_at'])
            ->groupBy('work_center_id');
    }

    /** @return array<string, array<string, mixed>> */
    private function biologicalRules(): array
    {
        $rules = [];
        foreach (DB::table('biological_planning_rules')->where('active', true)->get() as $row) {
            $data = get_object_vars($row);
            $rules[(int) $data['part_id'].'-'.(int) $data['operation_id']] = $data;
        }

        return $rules;
    }

    /** @return array<string, array<string, mixed>> */
    private function changeoverRules(): array
    {
        $rules = [];
        foreach (DB::table('work_center_changeover_rules')->where('active', true)->get() as $row) {
            $data = get_object_vars($row);
            $rules[(int) $data['work_center_id'].'|'.(string) $data['from_family'].'|'.(string) $data['to_family']] = $data;
        }

        return $rules;
    }

    /** @return array<int, list<array{center_id: int, priority: int, efficiency_factor: float, valid_from: string|null, valid_to: string|null, primary: bool}>> */
    private function workCenterOptions(Carbon $horizonStart, Carbon $horizonEnd): array
    {
        $options = [];
        $rows = DB::table('operation_work_center_options as option')
            ->join('work_centers as center', 'center.id', '=', 'option.work_center_id')
            ->where('option.active', true)
            ->where('option.qualification_status', 'APPROVED')
            ->where('center.active', true)
            ->where(fn ($query) => $query->whereNull('option.valid_from')->orWhere('option.valid_from', '<=', $horizonEnd))
            ->where(fn ($query) => $query->whereNull('option.valid_to')->orWhere('option.valid_to', '>=', $horizonStart))
            ->orderBy('option.priority')
            ->get(['option.operation_id', 'option.work_center_id', 'option.priority', 'option.efficiency_factor', 'option.valid_from', 'option.valid_to']);

        foreach ($rows as $row) {
            $data = get_object_vars($row);
            $options[(int) $data['operation_id']][] = [
                'center_id' => (int) $data['work_center_id'],
                'priority' => (int) $data['priority'],
                'efficiency_factor' => (float) $data['efficiency_factor'],
                'valid_from' => $data['valid_from'] === null ? null : (string) $data['valid_from'],
                'valid_to' => $data['valid_to'] === null ? null : (string) $data['valid_to'],
                'primary' => false,
            ];
        }

        return $options;
    }

    /**
     * @param  array<string, array<string, mixed>>  $rules
     * @return array<string, mixed>|null
     */
    private function findChangeoverRule(array $rules, int $centerId, string $fromFamily, string $toFamily): ?array
    {
        return $rules[$centerId.'|'.$fromFamily.'|'.$toFamily]
            ?? $rules[$centerId.'|*|'.$toFamily]
            ?? null;
    }

    /** @return array<int, list<array{event_id: int|null, source: string, quantity: float, available_at: Carbon}>> */
    private function materialPools(Carbon $horizonStart, Carbon $horizonEnd): array
    {
        $pools = [];
        $onHand = DB::table('containers')
            ->where('active', true)
            ->where('quarantined', false)
            ->where('quantity_current', '>', 0)
            ->whereNotIn('status', ['HOLD', 'REJECTED', 'CONSUMED'])
            ->groupBy('part_id')
            ->get(['part_id', DB::raw('SUM(quantity_current) as quantity')]);
        foreach ($onHand as $row) {
            $data = get_object_vars($row);
            $pools[(int) $data['part_id']][] = [
                'event_id' => null,
                'source' => 'ON_HAND',
                'quantity' => (float) $data['quantity'],
                'available_at' => $horizonStart->copy(),
            ];
        }

        $events = DB::table('material_supply_events')
            ->where('status', 'CONFIRMED')
            ->where('available_at', '<=', $horizonEnd)
            ->orderBy('available_at')
            ->get();
        foreach ($events as $row) {
            $data = get_object_vars($row);
            $pools[(int) $data['part_id']][] = [
                'event_id' => (int) $data['id'],
                'source' => 'EXPECTED',
                'quantity' => (float) $data['quantity'],
                'available_at' => Carbon::parse((string) $data['available_at']),
            ];
        }

        return $pools;
    }

    /**
     * @param  array<int, list<array{event_id: int|null, source: string, quantity: float, available_at: Carbon}>>  $pools
     * @return array{ready_at: Carbon, allocations: list<array{part_id: int, event_id: int|null, source: string, quantity: float, available_at: Carbon}>}|null
     */
    private function reserveMaterials(int $orderId, Carbon $earliest, Carbon $horizonEnd, array &$pools): ?array
    {
        $requirements = DB::table('production_order_materials')
            ->where('production_order_id', $orderId)
            ->whereColumn('required_quantity', '>', 'consumed_quantity')
            ->get(['part_id', 'required_quantity', 'consumed_quantity']);
        $proposed = $pools;
        $readyAt = $earliest->copy();
        $allocations = [];

        foreach ($requirements as $row) {
            $requirement = get_object_vars($row);
            $partId = (int) $requirement['part_id'];
            $remaining = (float) $requirement['required_quantity'] - (float) $requirement['consumed_quantity'];
            $sources = $proposed[$partId] ?? [];
            usort($sources, fn (array $a, array $b): int => $a['available_at']->getTimestamp() <=> $b['available_at']->getTimestamp());

            foreach ($sources as $index => $source) {
                if ($remaining <= 0.000001) {
                    break;
                }
                if ($source['quantity'] <= 0.000001 || $source['available_at']->gt($horizonEnd)) {
                    continue;
                }
                $quantity = min($remaining, $source['quantity']);
                $remaining -= $quantity;
                $sources[$index]['quantity'] -= $quantity;
                $readyAt = $readyAt->max($source['available_at']->copy());
                $allocations[] = [
                    'part_id' => $partId,
                    'event_id' => $source['event_id'],
                    'source' => $source['source'],
                    'quantity' => $quantity,
                    'available_at' => $source['available_at']->copy(),
                ];
            }

            if ($remaining > 0.000001) {
                return null;
            }
            $proposed[$partId] = $sources;
        }

        $pools = $proposed;

        return ['ready_at' => $readyAt, 'allocations' => $allocations];
    }

    /**
     * @param  Collection<int, \stdClass>  $operations
     */
    private function markUnscheduled(Collection $operations, string $reason): void
    {
        foreach ($operations as $operationRow) {
            $operation = get_object_vars($operationRow);
            $durationMinutes = max(1, (int) ceil((float) ($operation['duration_hours'] ?? 1) * 60));
            DB::table('production_order_operations')->where('id', (int) $operation['id'])->update([
                'schedule_status' => 'UNSCHEDULED',
                'schedule_reason' => $reason,
                'planned_minutes' => $durationMinutes,
                'planned_start' => null,
                'planned_end' => null,
                'planned_work_center_id' => null,
                'work_center_selection' => null,
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * @param  array<int, list<array{start: Carbon, end: Carbon}>>  $occupancies
     * @return array{start: Carbon, end: Carbon}|null
     */
    private function allocateDwell(int $centerId, Carbon $earliest, Carbon $horizonEnd, int $durationMinutes, int $parallelCapacity, array &$occupancies): ?array
    {
        $start = $earliest->copy();
        $existing = $occupancies[$centerId] ?? [];

        while ($start->lt($horizonEnd)) {
            $end = $start->copy()->addMinutes($durationMinutes);
            if ($end->gt($horizonEnd)) {
                return null;
            }

            $overlapping = array_values(array_filter(
                $existing,
                fn (array $interval): bool => $interval['start']->lt($end) && $interval['end']->gt($start),
            ));
            $events = [
                [$start->getTimestamp(), 1],
                [$end->getTimestamp(), -1],
            ];
            foreach ($overlapping as $interval) {
                $events[] = [$interval['start']->getTimestamp(), 1];
                $events[] = [$interval['end']->getTimestamp(), -1];
            }
            usort($events, fn (array $a, array $b): int => $a[0] === $b[0] ? $a[1] <=> $b[1] : $a[0] <=> $b[0]);
            $concurrent = 0;
            $maximum = 0;
            foreach ($events as [, $delta]) {
                $concurrent += $delta;
                $maximum = max($maximum, $concurrent);
            }

            if ($maximum <= $parallelCapacity) {
                $occupancy = ['start' => $start, 'end' => $end];
                $occupancies[$centerId][] = $occupancy;

                return $occupancy;
            }

            $nextStart = null;
            foreach ($overlapping as $interval) {
                if ($interval['end']->gt($start) && ($nextStart === null || $interval['end']->lt($nextStart))) {
                    $nextStart = $interval['end']->copy();
                }
            }
            if ($nextStart === null) {
                return null;
            }
            $start = $nextStart;
        }

        return null;
    }

    /**
     * @param  Collection<int, \stdClass>  $capacities
     * @param  array<string, Carbon>  $usedUntil
     * @return list<array{shift_id: int, start: Carbon, end: Carbon, minutes: int}>
     */
    private function allocate(Collection $capacities, int $centerId, Carbon $earliest, Carbon $horizonEnd, int $requiredMinutes, array &$usedUntil): array
    {
        $segments = [];
        $remaining = $requiredMinutes;
        $proposedUsedUntil = $usedUntil;
        $date = $earliest->copy()->startOfDay();
        while ($date->lt($horizonEnd) && $remaining > 0) {
            foreach ($capacities as $capacityRow) {
                $capacity = get_object_vars($capacityRow);
                $slotStart = Carbon::parse($date->toDateString().' '.(string) $capacity['starts_at']);
                $slotEnd = Carbon::parse($date->toDateString().' '.(string) $capacity['ends_at']);
                if ($slotEnd->lte($slotStart)) {
                    $slotEnd->addDay();
                }
                $capacityEnd = $slotStart->copy()->addMinutes(min((int) $capacity['available_minutes'], (int) $slotStart->diffInMinutes($slotEnd)));
                $key = $centerId.'-'.(int) $capacity['shift_id'].'-'.$date->toDateString();
                $start = $slotStart->copy()->max($earliest)->max($proposedUsedUntil[$key] ?? $slotStart);
                if ($start->gte($capacityEnd) || $start->gte($horizonEnd)) {
                    continue;
                }
                $minutes = min($remaining, (int) $start->diffInMinutes($capacityEnd), (int) $start->diffInMinutes($horizonEnd));
                if ($minutes < 1) {
                    continue;
                }
                $end = $start->copy()->addMinutes($minutes);
                $segments[] = ['shift_id' => (int) $capacity['shift_id'], 'start' => $start, 'end' => $end, 'minutes' => $minutes];
                $proposedUsedUntil[$key] = $end->copy();
                $remaining -= $minutes;
                if ($remaining === 0) {
                    break;
                }
            }
            $date->addDay();
        }

        if ($remaining !== 0) {
            return [];
        }

        $usedUntil = $proposedUsedUntil;

        return $segments;
    }
}
