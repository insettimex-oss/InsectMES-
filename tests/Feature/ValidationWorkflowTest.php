<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AccessControlSeeder;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ValidationWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $supervisor;

    private User $quality;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->supervisor = User::query()->where('email', 'supervisor@insetti.com')->firstOrFail();
        $this->quality = User::query()->where('email', 'calidad@insetti.com')->firstOrFail();
        $this->supervisor->update(['must_change_password' => false]);
        $this->quality->update(['must_change_password' => false]);
    }

    public function test_protocol_run_and_independent_electronic_signatures_form_a_complete_validation_record(): void
    {
        $this->actingAs($this->supervisor)->post('/mes/validation/protocols', [
            'code' => 'VAL-PILOT-BSF',
            'title' => 'Validación integral del lote piloto',
            'version' => '1.0',
            'scope' => 'Línea BSF piloto',
            'objective' => 'Demostrar trazabilidad, controles y recuperación durante un lote completo.',
            'acceptance_criteria' => 'Todos los pasos críticos deben ser conformes y contar con evidencia referenciada.',
            'steps_text' => "Ejecutar trazabilidad inversa | Origen identificado en menos de dos minutos\nRestaurar el respaldo | Integridad verificada sin pérdida de registros",
        ])->assertRedirect();

        $protocolId = (int) DB::table('validation_protocols')->value('id');
        $this->actingAs($this->quality)->patch("/mes/validation/protocols/{$protocolId}/approve", [
            'current_password' => AccessControlSeeder::TEST_PASSWORD,
            'reason' => 'Objetivo, pasos y criterios revisados por Calidad.',
        ])->assertRedirect();
        $this->assertDatabaseHas('validation_protocols', ['id' => $protocolId, 'status' => 'APPROVED', 'approved_by' => $this->quality->id]);

        $this->actingAs($this->supervisor)->post('/mes/validation/runs', [
            'validation_protocol_id' => $protocolId,
            'production_order_id' => null,
        ])->assertRedirect();
        $runId = (int) DB::table('validation_runs')->value('id');
        $steps = DB::table('validation_run_steps')->where('validation_run_id', $runId)->orderBy('sequence')->get();
        $this->assertCount(2, $steps);

        foreach ($steps as $step) {
            $this->patch("/mes/validation/steps/{$step->id}", [
                'status' => 'PASS',
                'actual_result' => 'Resultado conforme observado por el supervisor durante la prueba.',
                'evidence_reference' => "EXP-PILOT/STEP-{$step->sequence}",
            ])->assertRedirect();
        }
        $this->patch("/mes/validation/runs/{$runId}/complete", [
            'result_summary' => 'Los pasos se ejecutaron de forma conforme y las evidencias quedaron vinculadas.',
            'evidence_reference' => 'EXP-PILOT/VAL-2026-0001',
            'current_password' => AccessControlSeeder::TEST_PASSWORD,
            'reason' => 'Confirmo la ejecución y la exactitud de los resultados registrados.',
        ])->assertRedirect();
        $this->assertDatabaseHas('validation_runs', ['id' => $runId, 'status' => 'AWAITING_APPROVAL', 'executed_by' => $this->supervisor->id]);

        $this->actingAs($this->quality)->patch("/mes/validation/runs/{$runId}/approve", [
            'current_password' => AccessControlSeeder::TEST_PASSWORD,
            'reason' => 'Evidencia revisada; criterios de aceptación cumplidos.',
        ])->assertRedirect();

        $this->assertDatabaseHas('validation_runs', ['id' => $runId, 'status' => 'PASSED', 'approved_by' => $this->quality->id]);
        $this->assertDatabaseCount('electronic_signatures', 3);
        $this->assertDatabaseHas('electronic_signatures', ['signable_type' => 'validation_runs', 'signable_id' => $runId, 'meaning' => 'EXECUTED', 'user_id' => $this->supervisor->id]);
        $this->assertDatabaseHas('electronic_signatures', ['signable_type' => 'validation_runs', 'signable_id' => $runId, 'meaning' => 'APPROVED', 'user_id' => $this->quality->id]);
        $this->assertDatabaseHas('audit_events', ['event' => 'VALIDATION_RUN_APPROVED', 'auditable_id' => (string) $runId]);
    }

    public function test_signatures_require_password_and_separation_of_duties(): void
    {
        $admin = User::query()->where('email', 'admin@insetti.com')->firstOrFail();
        $this->actingAs($admin)->post('/mes/validation/protocols', [
            'code' => 'VAL-SEGREGATION',
            'title' => 'Prueba de segregación',
            'version' => '1.0',
            'scope' => 'Control interno',
            'objective' => 'Confirmar que una persona no crea y aprueba el mismo protocolo.',
            'acceptance_criteria' => 'El sistema rechaza la autoaprobación y contraseñas incorrectas.',
            'steps_text' => "Preparar registro | Registro disponible\nRevisar registro | Revisión independiente",
        ])->assertRedirect();
        $protocolId = (int) DB::table('validation_protocols')->value('id');

        $this->patch("/mes/validation/protocols/{$protocolId}/approve", [
            'current_password' => AccessControlSeeder::TEST_PASSWORD,
            'reason' => 'Intento de aprobación por el mismo creador.',
        ])->assertStatus(422);
        $this->actingAs($this->quality)->patch("/mes/validation/protocols/{$protocolId}/approve", [
            'current_password' => 'incorrecta',
            'reason' => 'Intento con credencial que no corresponde.',
        ])->assertSessionHasErrors('current_password');
        $this->assertDatabaseMissing('validation_protocols', ['id' => $protocolId, 'status' => 'APPROVED']);
    }

    public function test_electronic_signature_rows_are_immutable(): void
    {
        DB::table('electronic_signatures')->insert([
            'signable_type' => 'test',
            'signable_id' => 1,
            'meaning' => 'APPROVED',
            'user_id' => $this->quality->id,
            'signer_name' => $this->quality->name,
            'role_at_signing' => 'Calidad',
            'reason' => 'Registro de prueba para comprobar inmutabilidad.',
            'credential_verified_at' => now(),
            'signed_at' => now(),
            'digest_sha256' => hash('sha256', 'immutable-test'),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->expectException(QueryException::class);
        DB::table('electronic_signatures')->where('signable_type', 'test')->update(['reason' => 'alterado']);
    }
}
