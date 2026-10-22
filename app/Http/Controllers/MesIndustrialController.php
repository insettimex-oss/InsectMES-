<?php

namespace App\Http\Controllers;

use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MesIndustrialController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function openDowntime(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'work_center_id' => ['required', 'exists:work_centers,id'],
            'production_order_id' => ['nullable', 'exists:production_orders,id'],
            'downtime_reason_id' => ['required', 'exists:downtime_reasons,id'],
            'started_at' => ['required', 'date', 'before_or_equal:now'],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);
        if (DB::table('downtime_events')->where('work_center_id', $data['work_center_id'])->where('status', 'OPEN')->exists()) {
            throw ValidationException::withMessages(['work_center_id' => 'El centro ya tiene un paro abierto.']);
        }

        $number = 'PARO-'.now()->format('Ymd').'-'.str_pad((string) (DB::table('downtime_events')->count() + 1), 4, '0', STR_PAD_LEFT);
        $id = DB::table('downtime_events')->insertGetId($data + ['number' => $number, 'status' => 'OPEN', 'recorded_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        DB::table('work_centers')->where('id', $data['work_center_id'])->update(['status' => 'DOWNTIME', 'updated_at' => now()]);
        $this->audit->record($request, 'DOWNTIME_OPENED', 'downtime_events', $data['notes'] ?? 'Paro operativo', null, ['number' => $number], $id);

        return $this->success("Paro {$number} abierto y centro detenido.");
    }

    public function closeDowntime(Request $request, int $downtime): RedirectResponse
    {
        $data = $request->validate(['ended_at' => ['required', 'date', 'before_or_equal:now'], 'notes' => ['nullable', 'string', 'max:1500']]);
        DB::transaction(function () use ($request, $downtime, $data): void {
            $row = DB::table('downtime_events')->where('id', $downtime)->lockForUpdate()->first();
            if (! $row || $row->status !== 'OPEN') {
                throw ValidationException::withMessages(['downtime' => 'El paro no está disponible.']);
            }
            $start = strtotime((string) $row->started_at);
            $end = strtotime((string) $data['ended_at']);
            if ($end < $start) {
                throw ValidationException::withMessages(['ended_at' => 'El cierre no puede ser anterior al inicio.']);
            }
            $minutes = (int) floor(($end - $start) / 60);
            DB::table('downtime_events')->where('id', $downtime)->update(['status' => 'CLOSED', 'ended_at' => $data['ended_at'], 'duration_minutes' => $minutes, 'notes' => trim(($row->notes ?? '')."\n".($data['notes'] ?? '')), 'closed_by' => $request->user()->id, 'updated_at' => now()]);
            DB::table('work_centers')->where('id', $row->work_center_id)->update(['status' => 'IDLE', 'updated_at' => now()]);
            $this->audit->record($request, 'DOWNTIME_CLOSED', 'downtime_events', $data['notes'] ?? 'Paro cerrado', ['status' => 'OPEN'], ['status' => 'CLOSED', 'duration_minutes' => $minutes], $downtime);
        });

        return $this->success('Paro cerrado y tiempo real calculado.');
    }

    public function recordOee(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'production_date' => ['required', 'date', 'before_or_equal:today'],
            'shift_id' => ['required', 'exists:shifts,id'],
            'work_center_id' => ['required', 'exists:work_centers,id'],
            'planned_minutes' => ['required', 'integer', 'min:1', 'max:1440'],
            'downtime_minutes' => ['required', 'integer', 'min:0', 'lte:planned_minutes'],
            'ideal_cycle_minutes' => ['required', 'numeric', 'gt:0'],
            'total_count' => ['required', 'numeric', 'gt:0'],
            'good_count' => ['required', 'numeric', 'min:0', 'lte:total_count'],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);
        $runMinutes = max(1, (int) $data['planned_minutes'] - (int) $data['downtime_minutes']);
        $availability = $runMinutes / (int) $data['planned_minutes'];
        $performance = min(1, ((float) $data['ideal_cycle_minutes'] * (float) $data['total_count']) / $runMinutes);
        $quality = (float) $data['good_count'] / (float) $data['total_count'];
        $metrics = ['availability' => round($availability * 100, 3), 'performance' => round($performance * 100, 3), 'quality' => round($quality * 100, 3), 'oee' => round($availability * $performance * $quality * 100, 3)];
        DB::table('oee_snapshots')->updateOrInsert(
            ['production_date' => $data['production_date'], 'shift_id' => $data['shift_id'], 'work_center_id' => $data['work_center_id']],
            $data + $metrics + ['recorded_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()],
        );
        $this->audit->record($request, 'OEE_RECORDED', 'oee_snapshots', $data['notes'] ?? 'Cierre de turno', null, $metrics);

        return $this->success('OEE del turno calculado y guardado.');
    }

    public function createCertificate(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'production_order_id' => ['nullable', 'required_without:container_id', 'exists:production_orders,id'],
            'container_id' => ['nullable', 'required_without:production_order_id', 'exists:containers,id'],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);
        $query = DB::table('quality_inspections')->where('status', 'PASS')->where('disposition', 'RELEASE');
        if (! empty($data['production_order_id'])) {
            $query->where('production_order_id', $data['production_order_id']);
        }
        if (! empty($data['container_id'])) {
            $query->where('container_id', $data['container_id']);
        }
        $inspectionIds = $query->pluck('id');
        if ($inspectionIds->isEmpty()) {
            throw ValidationException::withMessages(['certificate' => 'Se requiere al menos una inspección aprobada y liberada.']);
        }

        $certificate = DB::transaction(function () use ($request, $data, $inspectionIds): object {
            $number = 'COA-'.now()->format('Y').'-'.str_pad((string) (DB::table('certificates_of_analysis')->count() + 1), 4, '0', STR_PAD_LEFT);
            $id = DB::table('certificates_of_analysis')->insertGetId($data + ['number' => $number, 'status' => 'DRAFT', 'created_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            foreach ($inspectionIds as $inspectionId) {
                DB::table('certificate_results')->insert(['certificate_of_analysis_id' => $id, 'quality_inspection_id' => $inspectionId, 'created_at' => now(), 'updated_at' => now()]);
            }
            $this->audit->record($request, 'COA_CREATED', 'certificates_of_analysis', $data['notes'] ?? 'Certificado preparado', null, ['number' => $number, 'results' => $inspectionIds->count()], $id);

            return (object) compact('id', 'number');
        });

        return $this->success("Certificado {$certificate->number} preparado para aprobación.");
    }

    public function approveCertificate(Request $request, int $certificate): RedirectResponse
    {
        abort_unless($request->user()->hasPermission('quality.approve'), 403);
        DB::transaction(function () use ($request, $certificate): void {
            $row = DB::table('certificates_of_analysis')->where('id', $certificate)->lockForUpdate()->first();
            if (! $row || $row->status !== 'DRAFT') {
                throw ValidationException::withMessages(['certificate' => 'El certificado no está disponible para aprobación.']);
            }
            $openDeviation = DB::table('quality_deviations')->where('status', '!=', 'CLOSED')->where(function ($query) use ($row): void {
                if ($row->production_order_id) {
                    $query->orWhere('production_order_id', $row->production_order_id);
                }
                if ($row->container_id) {
                    $query->orWhere('container_id', $row->container_id);
                }
            })->exists();
            if ($openDeviation) {
                throw ValidationException::withMessages(['certificate' => 'Existen desviaciones abiertas asociadas al lote.']);
            }
            DB::table('certificates_of_analysis')->where('id', $certificate)->update(['status' => 'APPROVED', 'approved_by' => $request->user()->id, 'approved_at' => now(), 'updated_at' => now()]);
            $this->audit->record($request, 'COA_APPROVED', 'certificates_of_analysis', 'Liberación analítica aprobada', ['status' => 'DRAFT'], ['status' => 'APPROVED'], $certificate);
        });

        return $this->success('COA aprobado; el lote cuenta con evidencia analítica liberada.');
    }

    public function retainSample(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'container_id' => ['required', 'exists:containers,id'],
            'production_order_id' => ['nullable', 'exists:production_orders,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'unit' => ['required', 'string', 'max:20'],
            'storage_location' => ['required', 'string', 'max:150'],
            'retained_at' => ['required', 'date', 'before_or_equal:today'],
            'expires_at' => ['required', 'date', 'after:retained_at'],
        ]);
        $code = 'RET-'.now()->format('Ymd').'-'.str_pad((string) (DB::table('retention_samples')->count() + 1), 4, '0', STR_PAD_LEFT);
        $id = DB::table('retention_samples')->insertGetId($data + ['code' => $code, 'status' => 'AVAILABLE', 'recorded_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        $this->audit->record($request, 'RETENTION_SAMPLE_CREATED', 'retention_samples', 'Muestra de retención registrada', null, ['code' => $code], $id);

        return $this->success("Muestra {$code} ingresada a retención.");
    }

    public function createSparePart(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:spare_parts,code'],
            'name' => ['required', 'string', 'max:180'],
            'quantity_on_hand' => ['required', 'numeric', 'min:0'],
            'reorder_point' => ['required', 'numeric', 'min:0'],
            'unit' => ['required', 'string', 'max:20'],
            'storage_location' => ['nullable', 'string', 'max:150'],
        ]);
        $id = DB::table('spare_parts')->insertGetId($data + ['active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->audit->record($request, 'SPARE_PART_CREATED', 'spare_parts', 'Alta de repuesto', null, $data, $id);

        return $this->success('Repuesto agregado al almacén de mantenimiento.');
    }

    public function consumeSparePart(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'maintenance_work_order_id' => ['required', 'exists:maintenance_work_orders,id'],
            'spare_part_id' => ['required', 'exists:spare_parts,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
        ]);
        DB::transaction(function () use ($request, $data): void {
            $spare = DB::table('spare_parts')->where('id', $data['spare_part_id'])->lockForUpdate()->first();
            if (! $spare || (float) $spare->quantity_on_hand < (float) $data['quantity']) {
                throw ValidationException::withMessages(['quantity' => 'No hay existencias suficientes del repuesto.']);
            }
            DB::table('spare_parts')->where('id', $spare->id)->update(['quantity_on_hand' => (float) $spare->quantity_on_hand - (float) $data['quantity'], 'updated_at' => now()]);
            $id = DB::table('maintenance_spare_part_usages')->insertGetId($data + ['recorded_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            $this->audit->record($request, 'SPARE_PART_CONSUMED', 'maintenance_spare_part_usages', 'Consumo contra orden de mantenimiento', null, $data, $id);
        });

        return $this->success('Repuesto consumido y existencia actualizada.');
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
