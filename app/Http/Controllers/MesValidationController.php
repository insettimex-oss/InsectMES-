<?php

namespace App\Http\Controllers;

use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MesValidationController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function createProtocol(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:180'],
            'version' => ['required', 'string', 'max:30'],
            'scope' => ['required', 'string', 'max:120'],
            'objective' => ['required', 'string', 'min:10', 'max:4000'],
            'acceptance_criteria' => ['required', 'string', 'min:10', 'max:4000'],
            'steps_text' => ['required', 'string', 'min:10', 'max:12000'],
        ]);
        $exists = DB::table('validation_protocols')->where('code', $data['code'])->where('version', $data['version'])->exists();
        if ($exists) {
            throw ValidationException::withMessages(['version' => 'Ya existe esa versión para el protocolo.']);
        }

        $lines = preg_split('/\r\n|\r|\n/', $data['steps_text']);
        if ($lines === false) {
            throw ValidationException::withMessages(['steps_text' => 'No fue posible interpretar los pasos del protocolo.']);
        }
        $steps = collect($lines)
            ->map(fn (string $line): string => trim($line))
            ->filter()
            ->values();
        if ($steps->count() < 2) {
            throw ValidationException::withMessages(['steps_text' => 'Registre al menos dos pasos verificables, uno por línea.']);
        }
        if ($steps->count() > 50) {
            throw ValidationException::withMessages(['steps_text' => 'El protocolo admite hasta 50 pasos.']);
        }

        $protocolId = DB::transaction(function () use ($data, $steps, $request): int {
            $id = DB::table('validation_protocols')->insertGetId([
                'code' => $data['code'],
                'title' => $data['title'],
                'version' => $data['version'],
                'scope' => $data['scope'],
                'objective' => $data['objective'],
                'acceptance_criteria' => $data['acceptance_criteria'],
                'status' => 'DRAFT',
                'created_by' => $request->user()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            foreach ($steps as $index => $line) {
                [$requirement, $expected] = array_pad(array_map('trim', explode('|', $line, 2)), 2, null);
                DB::table('validation_protocol_steps')->insert([
                    'validation_protocol_id' => $id,
                    'sequence' => $index + 1,
                    'requirement' => $requirement,
                    'expected_result' => $expected ?: $requirement,
                    'critical' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->audit->record($request, 'VALIDATION_PROTOCOL_CREATED', 'validation_protocols', 'Protocolo versionado creado', null, Arr::except($data, ['steps_text']) + ['steps' => $steps->count()], $id);

            return $id;
        });

        return $this->success("Protocolo creado con {$steps->count()} pasos verificables (ID {$protocolId}).");
    }

    public function approveProtocol(Request $request, int $protocol): RedirectResponse
    {
        $data = $this->signatureData($request);
        DB::transaction(function () use ($protocol, $data, $request): void {
            $record = DB::table('validation_protocols')->where('id', $protocol)->lockForUpdate()->first();
            abort_if($record === null, 404);
            abort_if($record->status !== 'DRAFT', 422, 'El protocolo ya no está en borrador.');
            abort_if((int) $record->created_by === (int) $request->user()->id, 422, 'El creador no puede aprobar su propio protocolo.');
            DB::table('validation_protocols')->where('id', $protocol)->update([
                'status' => 'APPROVED',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
                'updated_at' => now(),
            ]);
            $snapshot = (array) DB::table('validation_protocols')->where('id', $protocol)->first();
            $this->sign($request, 'validation_protocols', $protocol, 'APPROVED', $data['reason'], $snapshot);
            $this->audit->record($request, 'VALIDATION_PROTOCOL_APPROVED', 'validation_protocols', $data['reason'], (array) $record, $snapshot, $protocol);
        });

        return $this->success('Protocolo aprobado con firma electrónica y segregación de funciones.');
    }

    public function startRun(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'validation_protocol_id' => ['required', 'exists:validation_protocols,id'],
            'production_order_id' => ['nullable', 'exists:production_orders,id'],
        ]);

        $number = DB::transaction(function () use ($data, $request): string {
            $protocol = DB::table('validation_protocols')->where('id', $data['validation_protocol_id'])->lockForUpdate()->first();
            abort_if($protocol === null || $protocol->status !== 'APPROVED', 422, 'Solo puede ejecutar un protocolo aprobado.');
            $sequence = (int) DB::table('validation_runs')->max('id') + 1;
            $number = sprintf('VAL-%s-%04d', now()->format('Y'), $sequence);
            $runId = DB::table('validation_runs')->insertGetId([
                'number' => $number,
                'validation_protocol_id' => $protocol->id,
                'production_order_id' => $data['production_order_id'] ?? null,
                'status' => 'IN_PROGRESS',
                'started_by' => $request->user()->id,
                'started_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            foreach (DB::table('validation_protocol_steps')->where('validation_protocol_id', $protocol->id)->orderBy('sequence')->get() as $step) {
                DB::table('validation_run_steps')->insert([
                    'validation_run_id' => $runId,
                    'validation_protocol_step_id' => $step->id,
                    'sequence' => $step->sequence,
                    'requirement' => $step->requirement,
                    'expected_result' => $step->expected_result,
                    'status' => 'PENDING',
                    'critical' => $step->critical,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->audit->record($request, 'VALIDATION_RUN_STARTED', 'validation_runs', 'Ejecución creada desde protocolo aprobado', null, ['number' => $number, ...$data], $runId);

            return $number;
        });

        return $this->success("Ejecución {$number} iniciada con una copia controlada de los pasos.");
    }

    public function recordStep(Request $request, int $step): RedirectResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['PASS', 'FAIL', 'NA'])],
            'actual_result' => ['required', 'string', 'min:3', 'max:4000'],
            'evidence_reference' => ['required', 'string', 'min:3', 'max:255'],
        ]);
        DB::transaction(function () use ($step, $data, $request): void {
            $record = DB::table('validation_run_steps')->where('id', $step)->lockForUpdate()->first();
            abort_if($record === null, 404);
            $run = DB::table('validation_runs')->where('id', $record->validation_run_id)->lockForUpdate()->first();
            abort_if($run === null || $run->status !== 'IN_PROGRESS', 422, 'La ejecución ya no admite resultados.');
            DB::table('validation_run_steps')->where('id', $step)->update([
                ...$data,
                'executed_by' => $request->user()->id,
                'executed_at' => now(),
                'updated_at' => now(),
            ]);
            $this->audit->record($request, 'VALIDATION_STEP_RECORDED', 'validation_run_steps', $data['actual_result'], (array) $record, $data, $step);
        });

        return $this->success('Resultado y referencia de evidencia registrados.');
    }

    public function completeRun(Request $request, int $run): RedirectResponse
    {
        $data = $this->signatureData($request, [
            'result_summary' => ['required', 'string', 'min:10', 'max:4000'],
            'evidence_reference' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        $status = DB::transaction(function () use ($run, $data, $request): string {
            $record = DB::table('validation_runs')->where('id', $run)->lockForUpdate()->first();
            abort_if($record === null, 404);
            abort_if($record->status !== 'IN_PROGRESS', 422, 'La ejecución ya fue completada.');
            $steps = DB::table('validation_run_steps')->where('validation_run_id', $run)->get();
            abort_if($steps->isEmpty(), 422, 'La ejecución no contiene pasos.');
            abort_if($steps->contains(fn (object $step): bool => $step->status === 'PENDING'), 422, 'Todos los pasos deben tener resultado antes de completar.');
            $failed = $steps->contains(fn (object $step): bool => $step->status === 'FAIL');
            $status = $failed ? 'FAILED' : 'AWAITING_APPROVAL';
            $values = [
                'status' => $status,
                'executed_by' => $request->user()->id,
                'completed_at' => now(),
                'result_summary' => $data['result_summary'],
                'evidence_reference' => $data['evidence_reference'],
                'failure_reason' => $failed ? $data['result_summary'] : null,
                'updated_at' => now(),
            ];
            DB::table('validation_runs')->where('id', $run)->update($values);
            $snapshot = (array) DB::table('validation_runs')->where('id', $run)->first();
            $this->sign($request, 'validation_runs', $run, 'EXECUTED', $data['reason'], $snapshot);
            $this->audit->record($request, 'VALIDATION_RUN_COMPLETED', 'validation_runs', $data['reason'], (array) $record, $snapshot, $run);

            return $status;
        });

        return $this->success($status === 'FAILED' ? 'Ejecución cerrada como fallida; requiere corrección y repetición.' : 'Ejecución completada y enviada a aprobación independiente.');
    }

    public function approveRun(Request $request, int $run): RedirectResponse
    {
        $data = $this->signatureData($request);
        DB::transaction(function () use ($run, $data, $request): void {
            $record = DB::table('validation_runs')->where('id', $run)->lockForUpdate()->first();
            abort_if($record === null, 404);
            abort_if($record->status !== 'AWAITING_APPROVAL', 422, 'La ejecución no está lista para aprobación.');
            abort_if((int) $record->executed_by === (int) $request->user()->id, 422, 'El ejecutor no puede aprobar su propia validación.');
            $values = ['status' => 'PASSED', 'approved_by' => $request->user()->id, 'approved_at' => now(), 'updated_at' => now()];
            DB::table('validation_runs')->where('id', $run)->update($values);
            $snapshot = (array) DB::table('validation_runs')->where('id', $run)->first();
            $this->sign($request, 'validation_runs', $run, 'APPROVED', $data['reason'], $snapshot);
            $this->audit->record($request, 'VALIDATION_RUN_APPROVED', 'validation_runs', $data['reason'], (array) $record, $snapshot, $run);
        });

        return $this->success('Validación aprobada con segunda firma electrónica independiente.');
    }

    /** @param array<string, array<int, string>> $extraRules
     * @return array<string, mixed>
     */
    private function signatureData(Request $request, array $extraRules = []): array
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'reason' => ['required', 'string', 'min:8', 'max:1000'],
            ...$extraRules,
        ]);
        if (! Hash::check($data['current_password'], $request->user()->password)) {
            throw ValidationException::withMessages(['current_password' => 'La contraseña actual no es válida.']);
        }

        return $data;
    }

    /** @param array<string, mixed> $snapshot */
    private function sign(Request $request, string $type, int $id, string $meaning, string $reason, array $snapshot): void
    {
        $signedAt = now();
        $payload = [
            'signable_type' => $type,
            'signable_id' => $id,
            'meaning' => $meaning,
            'user_id' => $request->user()->id,
            'signer_name' => $request->user()->name,
            'role_at_signing' => $request->user()->roleName(),
            'reason' => $reason,
            'signed_at' => $signedAt->toIso8601String(),
            'snapshot' => $snapshot,
        ];
        DB::table('electronic_signatures')->insert([
            'signable_type' => $type,
            'signable_id' => $id,
            'meaning' => $meaning,
            'user_id' => $request->user()->id,
            'signer_name' => $request->user()->name,
            'role_at_signing' => $request->user()->roleName(),
            'reason' => $reason,
            'credential_verified_at' => $signedAt,
            'signed_at' => $signedAt,
            'digest_sha256' => hash('sha256', json_encode($payload, JSON_THROW_ON_ERROR)),
            'context' => json_encode(['ip' => $request->ip(), 'user_agent' => $request->userAgent(), 'snapshot' => $snapshot], JSON_THROW_ON_ERROR),
            'created_at' => $signedAt,
            'updated_at' => $signedAt,
        ]);
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
