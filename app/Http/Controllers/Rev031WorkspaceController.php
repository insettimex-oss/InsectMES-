<?php

namespace App\Http\Controllers;

use App\Models\Container;
use App\Models\Location;
use App\Models\Operation;
use App\Models\Part;
use App\Models\User;
use App\Services\AuditService;
use App\Services\InventoryWorkflowValidator;
use App\Services\RequisitionValidator;
use App\Services\RoleScreenAccess;
use App\Services\WorkspacePresentationValidator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class Rev031WorkspaceController extends Controller
{
    public const SCREENS = [
        'inventory-workflow' => 'inventory', 'requisitions' => 'requisitions', 'home' => 'dashboard', 'parts' => 'engineering', 'units' => 'engineering', 'locations' => 'engineering', 'operations' => 'engineering', 'wcs' => 'engineering', 'workcenters' => 'engineering', 'routing' => 'engineering', 'bom' => 'engineering', 'bsf-cycle' => 'engineering',
        'inventory' => 'inventory', 'containers' => 'inventory', 'lots' => 'inventory', 'trace' => 'traceability', 'movements' => 'inventory',
        'receive' => 'inventory', 'receipts' => 'inventory', 'finalizar' => 'inventory', 'oc' => 'inventory', 'proveedores' => 'inventory',
        'control' => 'production', 'rearing' => 'production', 'reproduction' => 'production', 'postprocess' => 'production', 'pack' => 'production', 'nursery' => 'production', 'incubators' => 'production',
        'job-manager' => 'planning', 'capacity-planning' => 'planning', 'mrp' => 'planning', 'prp' => 'planning',
        'equipos' => 'maintenance', 'calendario-pm' => 'maintenance', 'checklist-pm' => 'maintenance', 'checklist' => 'quality',
        'settings' => 'administration', 'setup' => 'administration', 'empresa' => 'administration', 'labels' => 'administration', 'label-designer' => 'administration', 'parameters' => 'administration', 'coststructure' => 'costs',
        'reports' => 'dashboard', 'pedidos' => 'logistics', 'shipping' => 'logistics', 'audit' => 'audit', 'continuidad' => 'continuity', 'fase-cero' => 'governance', 'firmas' => 'validation', 'validacion' => 'validation', 'integraciones' => 'integrations', 'users' => 'users', 'profiles' => 'users', 'help' => 'dashboard', 'hierarchy' => 'administration',
    ];

    public function __construct(private readonly AuditService $audit) {}

    public function page(): Response
    {
        return Inertia::render('mes/rev031');
    }

    public function bootstrap(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user->hasPermission('dashboard.read'), 403);
        $ready = Schema::hasTable('mes_settings');
        if (! $ready) {
            return response()->json(['ready' => false, 'message' => 'La ampliación de Rev031 se está preparando.']);
        }
        $stored = $this->stored();
        $fingerprint = $this->fingerprint();
        if ($stored && isset($stored['native_fingerprint']) && $stored['native_fingerprint'] !== $fingerprint) {
            // A native administration/integration action may have changed stock between visits.
            // Refresh authoritative inventory from SQLite, preserving the revision's other collections.
            $native = $this->initialState();
            $stored['state']['serials'] = $native['serials'];
            $stored['state']['parts'] = $native['parts'];
            $stored['state']['setupTables']['Locations'] = $native['setupTables']['Locations'];
        }
        $isAdmin = $user->isAdministrator();
        $permissionKeys = array_fill_keys($user->effectivePermissionKeys(), true);
        $can = fn (string $key): bool => $isAdmin || isset($permissionKeys[$key]);
        $levels = [];
        foreach (self::SCREENS as $screen => $module) {
            $levels[$screen] = $module === 'users' ? ($can('users.manage') ? 4 : 0)
                : ($isAdmin ? 4 : ($can($module.'.write') || $can($module.'.admin') ? 2 : ($can($module.'.read') ? 1 : 0)));
        }
        // These are production sub-screens from the supplied revision.
        foreach (['egg', 'transfer', 'harvest', 'feeding', 'bsf-flow', 'production', 'reproduction-flow', 'rearing-feeding', 'pre-treatment', 'guarderia', 'nursery-settings'] as $screen) {
            $levels[$screen] = $levels['control'] ?? 0;
        }
        $access = app(RoleScreenAccess::class);
        foreach ($levels as $screen => $level) {
            if (! $access->allows($user, $screen)) {
                $levels[$screen] = 0;
            }
        }
        $session = ['company' => $user->company, 'user' => $user->name, 'accountId' => (string) $user->id, 'profile' => 'laravel', 'role' => $user->roleName()];
        $viewState = $this->parameterViewState($stored['state'] ?? $this->initialState());
        $native = [];
        foreach ([['fase-cero', 'Fase 0', 'governance', 'governance.read'], ['validacion', 'Validación y firmas', 'validation', 'validation.read'], ['integraciones', 'Integraciones', 'integrations', 'integrations.read'], ['audit', 'Auditoría', 'audit', 'audit.read'], ['continuidad', 'Continuidad', 'continuity', 'continuity.read'], ['users', 'Usuarios y accesos', 'users', 'users.manage']] as [$id,$name,$path,$permission]) {
            if ($user->hasPermission($permission)) {
                if (! $access->allows($user, $id)) {
                    continue;
                }
                $native[] = compact('id', 'name') + ['href' => '/mes/'.$path];
            }
        }

        return response()->json([
            'assetHash' => json_decode(File::get(resource_path('js/lib/rev031-build.json')), true, flags: JSON_THROW_ON_ERROR)['hash'],
            'canEditGlossary' => $can('administration.write'),
            'canCompleteRequisitions' => $user->hasPermission('requisitions.approve'),
            'ready' => true, 'isAdministrator' => $user->isAdministrator(), 'state' => $viewState, 'revision' => $stored['revision'] ?? 0,
            'fingerprint' => $fingerprint, 'levels' => $levels, 'session' => $session, 'nativeNavigation' => $native,
            'security' => ['users' => [['id' => (string) $user->id, 'name' => $user->name, 'email' => $user->email, 'company' => $user->company, 'profile' => 'laravel', 'active' => true]], 'profiles' => [['id' => 'laravel', 'name' => $user->roleName(), 'admin' => $user->isAdministrator(), 'permissions' => $levels]], 'positions30' => [], 'rolePresets30' => true],
        ])->header('Cache-Control', 'no-store');
    }

    /** @return array<string, mixed>|null */
    private function stored(): ?array
    {
        $json = DB::table('mes_settings')->where('key', 'rev031.workspace')->value('value');

        return $json ? json_decode($json, true, flags: JSON_THROW_ON_ERROR) : null;
    }

    /** @param array<string, mixed> $state
     * @return array<string, mixed>
     */
    private function parameterViewState(array $state): array
    {
        $json = file_get_contents(resource_path('rev031/reference-parameters.json'));
        if ($json === false) {
            throw new \RuntimeException('No se pudo leer la referencia de parámetros Rev031.');
        }
        $reference = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        $metadata = array_column($reference, null, 'code');
        foreach ($state['parameters'] ?? [] as $index => $parameter) {
            $original = $metadata[$parameter['code']] ?? [];
            // Native scope corresponds to operation in Rev031. Recover descriptive fields only;
            // configured numeric values and later edits remain authoritative.
            if (! isset($parameter['operation'])) {
                $parameter['operation'] = $original['operation'] ?? $parameter['scope'] ?? '';
                $parameter['source'] = $original['source'] ?? $parameter['source'] ?? '';
            }
            $parameter['name'] ??= $parameter['description'] ?? $original['name'] ?? $parameter['code'];
            $parameter['part'] ??= $original['part'] ?? '';
            $parameter['workcenter'] ??= $original['workcenter'] ?? '';
            $state['parameters'][$index] = $parameter;
        }

        return $state;
    }

    private function fingerprint(): string
    {
        return hash('sha256', json_encode([
            DB::table('containers')->orderBy('id')->get(), DB::table('parts')->orderBy('id')->get(), DB::table('locations')->orderBy('id')->get(),
        ], JSON_THROW_ON_ERROR));
    }

    /** @return array<string, mixed> */
    private function initialState(): array
    {
        $parts = Part::orderBy('id')->get();
        $locations = Location::orderBy('id')->get();
        $partCodes = $parts->pluck('code', 'id');
        $prefixes = $parts->pluck('serial_prefix')->unique()->map(fn ($prefix) => ['active' => true, 'code' => $prefix, 'description' => $prefix, 'lastNumber' => 0])->values()->all();
        $siteParts = $parts->map(fn ($part) => ['part' => $part->code, 'desc' => $part->description, 'unit' => $part->unit, 'itemType' => $part->type, 'serialPrefix' => $part->serial_prefix, 'active' => $part->active])->all();
        foreach ([['MP-001', 'Pan', 'kg', 'Materia Prima'], ['MP-002', 'Suero', 'l', 'Materia Prima'], ['F-002', 'Alimento preparado premium 1', 'kg', 'WIP'], ['F-003', 'Alimento preparado premium 2', 'kg', 'WIP']] as [$code,$description,$unit,$type]) {
            if (! $parts->contains('code', $code)) {
                $siteParts[] = ['part' => $code, 'desc' => $description, 'unit' => $unit, 'itemType' => $type, 'serialPrefix' => 'BSF', 'active' => true];
            }
        }
        $statuses = DB::table('mes_container_statuses')->get()->map(fn ($row) => [
            'code' => $row->code, 'description' => $row->name, 'active' => true, 'activeStatus' => (bool) $row->active,
            'okStatus' => (bool) $row->ok, 'allowProduction' => (bool) $row->allow_production, 'allowMove' => (bool) $row->allow_move,
            'preventSplit' => ! $row->allow_split, 'preventMerge' => ! $row->allow_merge, 'isConsumed' => $row->code === 'CONSUMED', 'receivingStatus' => false,
        ])->all();
        $statuses[] = ['code' => 'RECIBO', 'description' => 'Pendiente de finalizar', 'active' => true, 'activeStatus' => true, 'okStatus' => false, 'allowProduction' => false, 'allowMove' => false, 'preventSplit' => true, 'preventMerge' => true, 'receivingStatus' => true];
        $operations = Operation::with(['workCenter', 'inputPart', 'outputPart'])->orderBy('sort_order')->get();

        return [
            'parts' => $siteParts, 'units' => collect($siteParts)->pluck('unit')->unique()->map(fn ($unit) => ['active' => true, 'code' => $unit, 'description' => $unit])->values()->all(),
            'setupTables' => [
                'Container_Status' => $statuses, 'Container_Type' => [['code' => 'BSF', 'description' => 'Contenedor BSF', 'active' => true]],
                'Move_Type' => collect(['RECEIVE', 'MOVE', 'CONSUME', 'PRODUCTION', 'SPLIT', 'MERGE'])->map(fn ($code) => ['code' => $code, 'description' => $code, 'active' => true])->all(),
                'Item_Type' => $parts->pluck('type')->unique()->map(fn ($code) => ['code' => $code, 'description' => $code, 'active' => true])->values()->all(),
                'Serial_Prefix' => $prefixes, 'Locations' => $locations->map(fn ($row) => ['code' => $row->code, 'description' => $row->description, 'active' => $row->active, 'locationType' => $row->type])->all(),
                'Users' => [], 'Bom' => DB::table('bom_lines')->get()->map(fn ($row) => ['active' => (bool) $row->active, 'parentPart' => $partCodes[$row->parent_part_id], 'componentPart' => $partCodes[$row->component_part_id], 'qtyPerUnit' => (float) $row->quantity_per_unit, 'unit' => $row->unit])->all(),
            ],
            'serials' => Container::with(['part', 'location'])->orderBy('id')->get()->map(fn ($row) => [
                ...($row->metadata['rev031'] ?? []), 'serial' => $row->serial, 'part' => $row->part->code, 'desc' => $row->part->description,
                'qtyCurrent' => $row->quantity_current, 'qtyInitial' => $row->quantity_current, 'unit' => $row->unit, 'location' => $row->location->code ?? '',
                'status' => $row->status, 'active' => $row->active, 'origin' => $row->origin, 'lot' => $row->lot_code ?? $row->supplier_lot ?? $row->production_lot?->format('Y-m-d') ?? '',
                'productionLot' => $row->production_lot?->format('Y-m-d'), 'date' => $row->created_at->toIso8601String(), 'createdAt' => $row->created_at->toIso8601String(), 'quarantined' => $row->quarantined,
            ])->all(),
            'cpOperations' => $operations->map(fn ($row) => ['code' => $row->code, 'name' => $row->name, 'wc' => ($row->workCenter->code ?? null), 'workcenter' => ($row->workCenter->description ?? null), 'part' => $row->outputPart->code, 'input' => $row->inputPart->code ?? '', 'inputName' => $row->inputPart->description ?? '', 'output' => $row->outputPart->description, 'unit' => $row->outputPart->unit, 'units' => [$row->outputPart->unit], 'duration' => $row->duration_hours, 'area' => $row->area])->all(),
            'receipts' => [], 'movements' => [], 'workcenterTx' => [], 'genealogy' => [], 'operationRuns' => [], 'productionLots' => [], 'counters' => ['receipt' => 1, 'move' => 1, 'wc' => 1],
            'parameters' => DB::table('parameters')->get()->map(fn ($row) => ['code' => $row->code, 'description' => $row->description, 'name' => $row->description, 'value' => (float) $row->value, 'unit' => $row->unit, 'scope' => $row->scope, 'source' => $row->source, 'active' => true])->all(),
            'messages' => [], 'todos' => [], 'favorites' => ['control', 'inventory', 'parts'], 'recents' => [],
            'priorLots34' => true,
        ];
    }

    public function persist(Request $request): JsonResponse
    {
        abort_unless(Schema::hasTable('mes_settings'), 409);
        abort_if(strlen($request->getContent()) > 20 * 1024 * 1024, 413);
        $data = $request->validate(['revision' => ['required', 'integer', 'min:0'], 'fingerprint' => ['required', 'string', 'size:64'], 'screen' => ['required', 'string', 'max:100'], 'state' => ['required', 'array'], 'state.parts' => ['required', 'array', 'max:20000'], 'state.serials' => ['present', 'array', 'max:100000'], 'state.setupTables' => ['required', 'array'], 'state.parts.*.part' => ['required', 'string', 'max:100', 'distinct'], 'state.parts.*.unit' => ['required', 'string', 'max:20'], 'state.serials.*.serial' => ['required', 'string', 'max:100', 'distinct'], 'state.serials.*.part' => ['required', 'string', 'max:100'], 'state.serials.*.qtyCurrent' => ['required', 'numeric', 'gte:0'], 'state.serials.*.unit' => ['required', 'string', 'max:20'], 'state.serials.*.status' => ['required', 'string', 'max:30'], 'state.serials.*.active' => ['required', 'boolean']]);
        // Laravel's validated() filters nested array keys. The revision also owns collections
        // such as nursery, recipes, labels and loadedSources, which must survive a round trip.
        $data['state'] = $request->input('state');

        return DB::transaction(function () use ($request, $data): JsonResponse {
            DB::table('mes_settings')->where('key', 'rev031.workspace')->lockForUpdate()->first();
            $stored = $this->stored();
            abort_unless(($stored['revision'] ?? 0) === $data['revision'], 409, 'Otra sesión guardó cambios. Recargue antes de continuar; su captura no se guardó.');
            abort_unless(hash_equals($this->fingerprint(), $data['fingerprint']), 409, 'El inventario nativo cambió en otra pantalla. Recargue antes de guardar.');
            $before = $this->parameterViewState($stored['state'] ?? $this->initialState());
            $state = $data['state'];
            $this->authorizeChanges($request->user(), $before, $state, $data['screen']);
            if (($before['units'] ?? []) !== ($state['units'] ?? [])) {
                validator(['units' => $state['units'] ?? null], [
                    'units' => ['required', 'array', 'max:1000'],
                    'units.*.code' => ['required', 'string', 'max:20', 'distinct:ignore_case'],
                    'units.*.description' => ['required', 'string', 'max:255'],
                ], ['units.*.code.distinct' => 'El código de unidad ya existe.'])->validate();
            }
            app(RequisitionValidator::class)->validate($request->user(), $before, $state);
            app(InventoryWorkflowValidator::class)->validate($before, $state);
            app(WorkspacePresentationValidator::class)->validate($request->user(), $before, $state);
            $this->validateInventory($before, $state);
            $this->mirror($request, $state);
            $revision = $data['revision'] + 1;
            $fingerprint = $this->fingerprint();
            DB::table('mes_settings')->updateOrInsert(['key' => 'rev031.workspace'], ['value' => json_encode(['revision' => $revision, 'state' => $state, 'native_fingerprint' => $fingerprint], JSON_THROW_ON_ERROR), 'created_at' => now(), 'updated_at' => now()]);
            $changed = array_values(array_filter(array_keys($state), fn ($key) => ($state[$key] ?? null) !== ($before[$key] ?? null)));
            $this->audit->record($request, 'REV031_SAVED', 'mes_settings', 'Rev031 / '.$data['screen'], ['revision' => $data['revision']], ['revision' => $revision, 'collections' => $changed], 'rev031.workspace');

            return response()->json(['revision' => $revision, 'fingerprint' => $this->fingerprint()]);
        }, 3);
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    private function authorizeChanges(User $user, array $before, array $after, string $screen): void
    {
        $module = self::SCREENS[$screen] ?? 'production';
        abort_unless($user->isAdministrator() || $user->hasPermission($module.'.read'), 403);
        if ($user->isAdministrator()) {
            return;
        }
        // Compare the same JSON representation received from the browser, including
        // Laravel's empty-string-to-null conversion and integral decimal numbers.
        $before = json_decode(json_encode($before, JSON_THROW_ON_ERROR), true, flags: JSON_THROW_ON_ERROR);
        array_walk_recursive($before, static function (&$value): void {
            if ($value === '') {
                $value = null;
            }
        });
        $after = json_decode(json_encode($after, JSON_THROW_ON_ERROR), true, flags: JSON_THROW_ON_ERROR);
        array_walk_recursive($after, static function (&$value): void {
            if ($value === '') {
                $value = null;
            }
        });
        $preferences = ['recents', 'favorites', 'messages', 'todos', 'screenActions'];
        $engineering = ['parts', 'units', 'engineering29', 'bomProfiles31', 'bomOutputs31', 'materialDensities31', 'recipeCorrection31', 'variableRecipes31', 'cpOperations'];
        foreach (array_unique([...array_keys($before), ...array_keys($after)]) as $key) {
            if (($before[$key] ?? null) === ($after[$key] ?? null) || in_array($key, $preferences, true)) {
                continue;
            }
            abort_unless(app(RoleScreenAccess::class)->allows($user, $screen), 403, 'Su rol no permite cambios en esta pantalla.');
            $permission = in_array($key, $engineering, true) ? 'engineering.write' : (in_array($key, ['settings', 'parameters', 'setupSchemas', 'labels30', 'configHistory'], true) ? 'administration.write' : ($module.'.write'));
            if ($key === 'glossary36') {
                abort_unless($user->hasPermission('administration.write'), 403);

                continue;
            }
            if ($key === 'labelPrints30') {
                abort_unless($user->hasPermission('inventory.read') || $user->hasPermission('production.read'), 403);

                continue;
            }
            if ($key === 'requisitions31') {
                abort_unless($user->hasPermission('requisitions.write') || $user->hasPermission('requisitions.approve'), 403);

                continue;
            }
            abort_if($screen === 'requisitions', 403, 'Una requisición no puede modificar inventario ni otros módulos.');
            if ($key === 'setupTables') {
                foreach ($after[$key] ?? [] as $table => $values) {
                    if ($values === ($before[$key][$table] ?? null)) {
                        continue;
                    }
                    if ($table === 'Serial_Prefix' && ($user->hasPermission('production.write') || $user->hasPermission('inventory.write'))) {
                        $oldPrefixes = collect($this->records($before[$key][$table] ?? []))->keyBy('code');
                        $onlyCounters = count($values) === $oldPrefixes->count();
                        foreach ($values as $prefix) {
                            $oldPrefix = $oldPrefixes->get($prefix['code']);
                            $next = $prefix;
                            unset($next['lastNumber']);
                            $previous = $oldPrefix ?? [];
                            unset($previous['lastNumber']);
                            if ($next !== $previous || ($prefix['lastNumber'] ?? 0) < ($oldPrefix['lastNumber'] ?? 0)) {
                                $onlyCounters = false;
                            }
                        }
                        if ($onlyCounters) {
                            continue;
                        }
                    }
                    $required = in_array($table, ['Bom', 'Locations', 'Serial_Prefix'], true) ? 'engineering.write' : 'administration.write';
                    abort_unless($user->hasPermission($required), 403, 'El cambio del catálogo requiere '.$required);
                }
            } else {
                abort_unless($user->hasPermission($permission), 403, 'El cambio requiere '.$permission);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $state
     */
    private function validateInventory(array $before, array $state): void
    {
        $parts = collect($this->records($state['parts']))->keyBy('part');
        $locations = collect($this->records($state['setupTables']['Locations'] ?? []))->keyBy('code');
        $statuses = collect($this->records($state['setupTables']['Container_Status'] ?? []))->keyBy('code');
        $new = collect($this->records($state['serials']))->keyBy('serial');
        foreach ($state['serials'] as $row) {
            if (! $parts->has($row['part']) || ! $statuses->has($row['status']) || ! empty($row['location']) && ! $locations->has($row['location'])) {
                throw ValidationException::withMessages(['state' => 'El contenedor '.$row['serial'].' tiene una referencia de parte, estatus o ubicación inválida.']);
            }
        }
        foreach ($before['serials'] ?? [] as $old) {
            $row = $new->get($old['serial']);
            if (! $row) {
                throw ValidationException::withMessages(['state' => 'No se permite borrar contenedores ni su historial.']);
            }
            $nurseryAdvance = $old['part'] === 'WIP-NUR' && $row['part'] === 'BSF004'
                && collect($this->records($state['nursery']['entries'] ?? []))->contains(fn ($entry) => $entry['serial'] === $old['serial'] && $entry['level'] === 5);
            if ((! $nurseryAdvance && $old['part'] !== $row['part']) || strcasecmp($old['unit'], $row['unit']) !== 0) {
                throw ValidationException::withMessages(['state' => 'La parte y unidad de un serial existente no pueden sustituirse.']);
            }
            $consumed = (float) $row['qtyCurrent'] < (float) $old['qtyCurrent'] - .0000001;
            $oldStatus = collect($this->records($before['setupTables']['Container_Status']))->firstWhere('code', $old['status']);
            if ($consumed && (! $old['active'] || ($old['quarantined'] ?? false) || ($oldStatus['activeStatus'] ?? true) === false || ($oldStatus['receivingStatus'] ?? false) || ! ($oldStatus['okStatus'] ?? false))) {
                throw ValidationException::withMessages(['state' => 'Un contenedor inactivo, en cuarentena o pendiente no puede consumirse.']);
            }
            $native = Container::where('serial', $old['serial'])->first();
            if ($native?->quarantined && ($row['status'] !== $old['status'] || $row['active'] !== $old['active'])) {
                throw ValidationException::withMessages(['state' => 'La cuarentena debe resolverse mediante el flujo autorizado de Calidad.']);
            }
        }
    }

    /** @param array<string, mixed> $state */
    private function mirror(Request $request, array $state): void
    {
        foreach ($state['parts'] as $row) {
            $existing = Part::where('code', $row['part'])->first();
            if ($existing && strcasecmp($existing->unit, $row['unit']) !== 0 && Container::where('part_id', $existing->id)->exists()) {
                throw ValidationException::withMessages(['state' => 'La unidad de una parte con inventario no puede cambiarse.']);
            }
            Part::updateOrCreate(['code' => $row['part']], ['description' => $row['desc'] ?? $row['part'], 'unit' => $row['unit'], 'type' => $row['itemType'] ?? 'WIP', 'serial_prefix' => $row['serialPrefix'] ?? 'BSF', 'active' => $row['active'] ?? true]);
        }
        foreach ($state['setupTables']['Locations'] ?? [] as $row) {
            Location::updateOrCreate(['code' => $row['code']], ['description' => $row['description'] ?? $row['code'], 'type' => $row['locationType'] ?? 'Workcenter', 'active' => $row['active'] ?? true]);
        }
        $partIds = Part::pluck('id', 'code');
        $locationIds = Location::pluck('id', 'code');
        foreach ($state['serials'] as $row) {
            $container = Container::where('serial', $row['serial'])->first();
            $metadata = $container->metadata ?? [];
            Container::updateOrCreate(['serial' => $row['serial']], [
                'part_id' => $partIds[$row['part']], 'location_id' => $locationIds[$row['location'] ?? ''] ?? null,
                'quantity_current' => $row['qtyCurrent'], 'unit' => $row['unit'], 'status' => $row['status'], 'active' => $row['active'],
                'origin' => substr((string) ($row['origin'] ?? 'REV031'), 0, 30), 'lot_code' => $row['lot'] ?? null,
                'metadata' => [...$metadata, 'rev031' => $row, 'finalized' => ! ($row['receiptPending30'] ?? false)],
            ]);
        }
        $containers = Container::pluck('id', 'serial');
        foreach ($state['movements'] ?? [] as $row) {
            if (! isset($containers[$row['serial'] ?? ''])) {
                continue;
            }
            $reference = 'REV031:'.($row['id'] ?? hash('sha256', json_encode($row, JSON_THROW_ON_ERROR)));
            if (DB::table('inventory_movements')->where('reference', $reference)->exists()) {
                continue;
            }
            DB::table('inventory_movements')->insert([
                'container_id' => $containers[$row['serial']], 'type' => substr((string) ($row['type'] ?? 'REV031'), 0, 30), 'quantity' => $row['qty'] ?? 0, 'unit' => $row['unit'] ?? '',
                'reference' => $reference, 'notes' => $row['ref'] ?? null, 'user_id' => $request->user()->id, 'occurred_at' => $row['ts'] ?? now(), 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
        foreach ($state['genealogy'] ?? [] as $row) {
            $parent = $containers[$row['parent'] ?? ''] ?? null;
            $child = $containers[$row['child'] ?? ''] ?? null;
            if (! $child) {
                continue;
            }
            $group = 'R31-'.substr(hash('sha256', json_encode($row, JSON_THROW_ON_ERROR)), 0, 32);
            if (! DB::table('genealogy_events')->where('event_group', $group)->exists()) {
                DB::table('genealogy_events')->insert(['event_group' => $group, 'parent_container_id' => $parent, 'child_container_id' => $child, 'action' => substr($row['action'] ?? 'REV031', 0, 40), 'quantity' => $row['qty'] ?? null, 'unit' => $row['unit'] ?? null, 'reason' => $row['ref'] ?? null, 'user_id' => $request->user()->id, 'occurred_at' => $row['ts'] ?? now(), 'created_at' => now(), 'updated_at' => now()]);
            }
        }
    }

    /** @return list<array<string, mixed>> */
    private function records(mixed $value): array
    {
        if (! is_array($value)) {
            throw ValidationException::withMessages(['state' => 'El catálogo debe contener una lista de registros.']);
        }
        foreach ($value as $row) {
            if (! is_array($row)) {
                throw ValidationException::withMessages(['state' => 'El catálogo contiene un registro inválido.']);
            }
        }

        return array_values($value);
    }
}
