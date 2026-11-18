<?php

namespace Tests\Feature;

use App\Models\Container;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class WorkspaceOperationsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->withoutVite();
        $this->actingAs(User::where('email', 'admin@insetti.com')->firstOrFail());
    }

    private function payload(): array
    {
        $boot = $this->getJson('/mes/rev031/bootstrap')->assertOk()->json();

        return ['revision' => $boot['revision'], 'fingerprint' => $boot['fingerprint'], 'screen' => 'inventory', 'state' => $boot['state']];
    }

    private function tx(string $action, array $sources, array $outputs, ?string $target = null, ?string $destination = null): array
    {
        return ['id' => (string) Str::uuid(), 'action' => $action, 'sources' => $sources, 'outputs' => $outputs, 'target' => $target, 'destination' => $destination, 'at' => now()->toIso8601String()];
    }

    public function test_mass_move_changes_only_destination_and_preserves_serials_and_quantities(): void
    {
        $data = $this->payload();
        $sources = array_slice($data['state']['serials'], 0, 2);
        $codes = array_column($sources, 'serial');
        foreach ($data['state']['serials'] as &$row) {
            if (in_array($row['serial'], $codes, true)) {
                $row['location'] = 'ALM-PT';
            }
        }unset($row);
        $data['state']['inventoryTransactions36'] = [$this->tx('Move', $codes, array_map(fn ($row) => ['serial' => $row['serial'], 'quantity' => $row['qtyCurrent']], $sources), null, 'ALM-PT')];
        $this->postJson('/mes/rev031/state', $data)->assertOk();
        foreach ($sources as $source) {
            $current = Container::where('serial', $source['serial'])->firstOrFail();
            $this->assertEquals($source['qtyCurrent'], $current->quantity_current);
            $this->assertSame('ALM-PT', $current->location->code);
        }
    }

    public function test_split_retains_original_and_conserves_quantity(): void
    {
        $data = $this->payload();
        $source = $data['state']['serials'][0];
        $half = $source['qtyCurrent'] / 2;
        $data['state']['serials'][0]['qtyCurrent'] = $half;
        $child = $source;
        $child['serial'] = 'QA-SPLIT-CHILD';
        $child['qtyCurrent'] = $half;
        $data['state']['serials'][] = $child;
        $data['state']['inventoryTransactions36'] = [$this->tx('Split', [$source['serial']], [['serial' => $source['serial'], 'quantity' => $half], ['serial' => $child['serial'], 'quantity' => $half]], $source['serial'])];
        $this->postJson('/mes/rev031/state', $data)->assertOk();
        $this->assertDatabaseHas('containers', ['serial' => $source['serial'], 'active' => true]);
        $this->assertDatabaseHas('containers', ['serial' => 'QA-SPLIT-CHILD', 'active' => true]);
        $this->assertEquals($source['qtyCurrent'], Container::whereIn('serial', [$source['serial'], $child['serial']])->sum('quantity_current'));
    }

    public function test_merge_retains_selected_existing_target_and_rejects_different_parts(): void
    {
        $source = Container::firstOrFail();
        $copy = $source->replicate();
        $copy->serial = 'QA-MERGE-TARGET';
        $copy->save();
        $data = $this->payload();
        $first = $data['state']['serials'][0];
        $last = array_key_last($data['state']['serials']);
        $target = $data['state']['serials'][$last];
        $data['state']['serials'][0]['qtyCurrent'] = 0;
        $data['state']['serials'][0]['active'] = false;
        $data['state']['serials'][0]['status'] = 'CONSUMED';
        $total = $first['qtyCurrent'] + $target['qtyCurrent'];
        $data['state']['serials'][$last]['qtyCurrent'] = $total;
        $data['state']['inventoryTransactions36'] = [$this->tx('Merge', [$first['serial'], $target['serial']], [['serial' => $target['serial'], 'quantity' => $total]], $target['serial'])];
        $this->postJson('/mes/rev031/state', $data)->assertOk();
        $this->assertEquals($total, $copy->fresh()->quantity_current);
        $this->assertFalse($source->fresh()->active);
        $this->assertDatabaseCount('containers', 7);
        $data = $this->payload();
        $a = $data['state']['serials'][1];
        $b = $data['state']['serials'][2];
        $data['state']['inventoryTransactions36'] = [$this->tx('Merge', [$a['serial'], $b['serial']], [['serial' => $a['serial'], 'quantity' => $a['qtyCurrent']]], $a['serial']), ...$data['state']['inventoryTransactions36']];
        $this->postJson('/mes/rev031/state', $data)->assertUnprocessable();
    }

    public function test_unbalanced_split_is_rejected_atomically(): void
    {
        $data = $this->payload();
        $source = $data['state']['serials'][0];
        $child = $source;
        $child['serial'] = 'QA-INVALID';
        $data['state']['serials'][] = $child;
        $data['state']['inventoryTransactions36'] = [$this->tx('Split', [$source['serial']], [['serial' => $source['serial'], 'quantity' => $source['qtyCurrent']], ['serial' => $child['serial'], 'quantity' => $child['qtyCurrent']]], $source['serial'])];
        $this->postJson('/mes/rev031/state', $data)->assertUnprocessable();
        $this->assertDatabaseMissing('containers', ['serial' => 'QA-INVALID']);
    }

    public function test_glossary_changes_display_names_without_changing_data_and_requires_configuration_permission(): void
    {
        $data = $this->payload();
        $data['state']['glossary36'] = ['inventory' => ['column:No Parte' => 'xyz']];
        $this->postJson('/mes/rev031/state', $data)->assertOk();
        $this->getJson('/mes/rev031/bootstrap')->assertJsonPath('state.glossary36.inventory.column:No Parte', 'xyz');
        $operator = User::where('email', 'operador@insetti.com')->firstOrFail();
        $operator->update(['must_change_password' => false]);
        $this->actingAs($operator);
        $data = $this->payload();
        $data['state']['glossary36']['inventory']['column:No Parte'] = 'alterado';
        $this->postJson('/mes/rev031/state', $data)->assertForbidden();
    }

    public function test_read_permission_allows_audited_label_print_but_not_changes_to_inventory(): void
    {
        $data = $this->payload();
        $data['state']['labels30'] = ['templates' => [['code' => 'QA-LABEL', 'active' => true]], 'assignments' => []];
        $this->postJson('/mes/rev031/state', $data)->assertOk();
        $user = User::where('email', 'direccion@insetti.com')->firstOrFail();
        $user->update(['must_change_password' => false]);
        $this->actingAs($user);
        $data = $this->payload();
        $data['state']['labelPrints30'] = [['date' => now()->toIso8601String(), 'serials' => [$data['state']['serials'][0]['serial']], 'labels' => ['QA-LABEL']]];
        $this->postJson('/mes/rev031/state', $data)->assertOk();
        $data = $this->payload();
        $data['state']['serials'][0]['qtyCurrent'] += 1;
        $this->postJson('/mes/rev031/state',$data)->assertForbidden();
    }
}
