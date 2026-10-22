<?php

namespace App\Http\Controllers;

use App\Models\Container;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MesAdvancedController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function createLaboratoryMethod(Request $request): RedirectResponse
    {
        abort_unless($request->user()->hasPermission('laboratory.approve'), 403);
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50', 'unique:laboratory_methods,code'],
            'name' => ['required', 'string', 'max:180'],
            'category' => ['required', Rule::in(['MICROBIOLOGY', 'CHEMISTRY', 'STABILITY'])],
            'result_type' => ['required', Rule::in(['NUMERIC', 'TEXT'])],
            'unit' => ['nullable', 'string', 'max:30'],
            'min_value' => ['nullable', 'numeric'],
            'max_value' => ['nullable', 'numeric', 'gte:min_value'],
        ]);
        $id = DB::table('laboratory_methods')->insertGetId($data + ['active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->audit->record($request, 'LAB_METHOD_CREATED', 'laboratory_methods', 'Método analítico configurado', null, $data, $id);

        return $this->success('Método analítico agregado al catálogo interno.');
    }

    public function createLaboratorySample(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'container_id' => ['nullable', 'required_without:production_order_id', 'exists:containers,id'],
            'production_order_id' => ['nullable', 'required_without:container_id', 'exists:production_orders,id'],
            'purpose' => ['required', Rule::in(['RELEASE', 'STABILITY', 'INVESTIGATION', 'PROCESS'])],
            'received_at' => ['required', 'date', 'before_or_equal:now'],
            'due_at' => ['nullable', 'date', 'after_or_equal:received_at'],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);
        $number = 'LAB-'.now()->format('Ymd').'-'.str_pad((string) (DB::table('laboratory_samples')->count() + 1), 4, '0', STR_PAD_LEFT);
        $id = DB::table('laboratory_samples')->insertGetId($data + ['number' => $number, 'status' => 'RECEIVED', 'received_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
        $this->audit->record($request, 'LAB_SAMPLE_RECEIVED', 'laboratory_samples', $data['notes'] ?? 'Muestra recibida', null, ['number' => $number, 'purpose' => $data['purpose']], $id);

        return $this->success("Muestra {$number} recibida por el laboratorio interno.");
    }

    public function recordLaboratoryResult(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'laboratory_sample_id' => ['required', 'exists:laboratory_samples,id'],
            'laboratory_method_id' => ['required', 'exists:laboratory_methods,id'],
            'result_value' => ['nullable', 'numeric'],
            'result_text' => ['nullable', 'string', 'max:500'],
            'tested_at' => ['required', 'date', 'before_or_equal:now'],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);
        $method = DB::table('laboratory_methods')->where('id', $data['laboratory_method_id'])->where('active', true)->first();
        if (! $method) {
            throw ValidationException::withMessages(['laboratory_method_id' => 'El método analítico no está disponible.']);
        }
        if (DB::table('laboratory_results')->where('laboratory_sample_id', $data['laboratory_sample_id'])->where('laboratory_method_id', $data['laboratory_method_id'])->exists()) {
            throw ValidationException::withMessages(['laboratory_method_id' => 'La muestra ya tiene un resultado para este método.']);
        }
        if ($method->result_type === 'NUMERIC' && $data['result_value'] === null) {
            throw ValidationException::withMessages(['result_value' => 'El método requiere un resultado numérico.']);
        }
        if ($method->result_type === 'TEXT' && empty($data['result_text'])) {
            throw ValidationException::withMessages(['result_text' => 'El método requiere un resultado de texto.']);
        }

        $status = 'REVIEW';
        if ($method->result_type === 'NUMERIC' && ($method->min_value !== null || $method->max_value !== null)) {
            $value = (float) $data['result_value'];
            $status = ($method->min_value === null || $value >= (float) $method->min_value)
                && ($method->max_value === null || $value <= (float) $method->max_value) ? 'PASS' : 'FAIL';
        }

        DB::transaction(function () use ($request, $data, $method, $status): void {
            $id = DB::table('laboratory_results')->insertGetId($data + ['status' => $status, 'tested_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            $statuses = DB::table('laboratory_results')->where('laboratory_sample_id', $data['laboratory_sample_id'])->pluck('status');
            $sampleStatus = $statuses->contains('FAIL') ? 'FAILED' : ($statuses->contains('REVIEW') ? 'REVIEW_REQUIRED' : 'COMPLETED');
            DB::table('laboratory_samples')->where('id', $data['laboratory_sample_id'])->update(['status' => $sampleStatus, 'completed_at' => $sampleStatus === 'COMPLETED' ? now() : null, 'updated_at' => now()]);
            $sample = DB::table('laboratory_samples')->where('id', $data['laboratory_sample_id'])->first();
            if ($status === 'FAIL' && $sample?->container_id) {
                Container::query()->whereKey($sample->container_id)->update(['quarantined' => true, 'status' => 'HOLD']);
            }
            $this->audit->record($request, 'LAB_RESULT_RECORDED', 'laboratory_results', $data['notes'] ?? 'Resultado analítico', null, ['method' => $method->code, 'status' => $status, 'sample_status' => $sampleStatus], $id);
        });

        return $this->success("Resultado {$status} registrado; la muestra y el lote fueron actualizados.");
    }

    public function recordConditionReading(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'asset_id' => ['required', 'exists:assets,id'],
            'metric' => ['required', Rule::in(['OPERATING_HOURS', 'CYCLES', 'TEMPERATURE', 'VIBRATION', 'CURRENT', 'PRESSURE'])],
            'value' => ['required', 'numeric', 'min:0'],
            'unit' => ['required', 'string', 'max:30'],
            'warning_limit' => ['nullable', 'numeric', 'min:0'],
            'critical_limit' => ['nullable', 'numeric', 'gte:warning_limit'],
            'measured_at' => ['required', 'date', 'before_or_equal:now'],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);
        $value = (float) $data['value'];
        $status = ! empty($data['critical_limit']) && $value >= (float) $data['critical_limit']
            ? 'CRITICAL'
            : (! empty($data['warning_limit']) && $value >= (float) $data['warning_limit'] ? 'WARNING' : 'NORMAL');

        DB::transaction(function () use ($request, $data, $status): void {
            $id = DB::table('maintenance_condition_readings')->insertGetId($data + ['status' => $status, 'recorded_by' => $request->user()->id, 'created_at' => now(), 'updated_at' => now()]);
            if ($status === 'CRITICAL') {
                $hasOpenOrder = DB::table('maintenance_work_orders')->where('asset_id', $data['asset_id'])->where('status', '!=', 'COMPLETED')->exists();
                if (! $hasOpenOrder) {
                    $number = 'OT-'.now()->format('Y').'-'.str_pad((string) (DB::table('maintenance_work_orders')->count() + 1), 4, '0', STR_PAD_LEFT);
                    DB::table('maintenance_work_orders')->insert([
                        'number' => $number,
                        'asset_id' => $data['asset_id'],
                        'type' => 'CORRECTIVE',
                        'priority' => 'CRITICAL',
                        'status' => 'OPEN',
                        'description' => "Condición crítica {$data['metric']}: {$data['value']} {$data['unit']}",
                        'requested_by' => $request->user()->id,
                        'assigned_to' => $request->user()->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
                DB::table('assets')->where('id', $data['asset_id'])->update(['status' => 'BLOCKED', 'updated_at' => now()]);
            }
            $this->audit->record($request, 'ASSET_CONDITION_RECORDED', 'maintenance_condition_readings', $data['notes'] ?? 'Lectura de condición', null, ['metric' => $data['metric'], 'value' => $data['value'], 'status' => $status], $id);
        });

        return $this->success($status === 'CRITICAL' ? 'Condición crítica: activo bloqueado y OT generada.' : "Lectura {$status} registrada.");
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
