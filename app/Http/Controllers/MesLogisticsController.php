<?php

namespace App\Http\Controllers;

use App\Models\Container;
use App\Models\Part;
use App\Services\AuditService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class MesLogisticsController extends Controller
{
    public function __construct(private readonly AuditService $audit) {}

    public function createCustomer(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:30', 'unique:customers,code'],
            'name' => ['required', 'string', 'max:180'],
            'customer_type' => ['required', Rule::in(['INDUSTRIAL', 'AGRICULTURAL', 'RESEARCH', 'DISTRIBUTOR'])],
            'tax_id' => ['nullable', 'string', 'max:30'],
            'contact_name' => ['nullable', 'string', 'max:180'],
            'email' => ['nullable', 'email', 'max:180'],
            'phone' => ['nullable', 'string', 'max:40'],
        ]);

        $id = DB::table('customers')->insertGetId([...$data, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);
        $this->audit->record($request, 'CUSTOMER_CREATED', 'customers', 'Alta de cliente comercial', null, $data, $id);

        return $this->success('Cliente creado y disponible para pedidos.');
    }

    public function createOrder(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'customer_id' => ['required', 'exists:customers,id'],
            'part_id' => ['required', 'exists:parts,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'priority' => ['required', Rule::in(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'])],
            'requested_at' => ['required', 'date'],
            'promised_at' => ['nullable', 'date', 'after_or_equal:requested_at'],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);

        $order = DB::transaction(function () use ($data, $request): object {
            $part = Part::query()->findOrFail((int) $data['part_id']);
            $number = $this->nextNumber('SO', 'sales_orders');
            $id = DB::table('sales_orders')->insertGetId([
                'number' => $number,
                'customer_id' => $data['customer_id'],
                'status' => 'DRAFT',
                'priority' => $data['priority'],
                'requested_at' => $data['requested_at'],
                'promised_at' => $data['promised_at'] ?? null,
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('sales_order_lines')->insert([
                'sales_order_id' => $id,
                'part_id' => $part->id,
                'ordered_quantity' => $data['quantity'],
                'unit' => $part->unit,
                'status' => 'OPEN',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->audit->record($request, 'SALES_ORDER_CREATED', 'sales_orders', $data['notes'] ?? 'Pedido comercial creado', null, ['number' => $number, ...$data], $id);

            return (object) ['id' => $id, 'number' => $number];
        });

        return $this->success("Pedido {$order->number} creado. Libérelo para reservar por FEFO.");
    }

    public function allocateOrder(Request $request, int $order): RedirectResponse
    {
        DB::transaction(function () use ($order, $request): void {
            $salesOrder = DB::table('sales_orders')->where('id', $order)->lockForUpdate()->first();
            abort_if($salesOrder === null || ! in_array($salesOrder->status, ['DRAFT', 'RELEASED'], true), 422, 'El pedido no está disponible para asignación.');
            $lines = DB::table('sales_order_lines')->where('sales_order_id', $order)->lockForUpdate()->get();

            foreach ($lines as $line) {
                $required = round((float) $line->ordered_quantity - (float) $line->allocated_quantity, 4);
                if ($required <= 0) {
                    continue;
                }

                $candidates = DB::table('containers as c')
                    ->leftJoin('locations as l', 'l.id', '=', 'c.location_id')
                    ->where('c.part_id', $line->part_id)
                    ->where('c.active', true)
                    ->where('c.quarantined', false)
                    ->where('c.status', 'OK')
                    ->where('c.quantity_current', '>', 0)
                    ->whereRaw('(c.quantity_current - COALESCE((SELECT SUM(a.quantity) FROM shipment_allocations a WHERE a.container_id = c.id AND a.status IN (?, ?)), 0)) > 0', ['ALLOCATED', 'PICKED'])
                    ->orderByRaw('CASE WHEN c.expires_at IS NULL THEN 1 ELSE 0 END')
                    ->orderBy('c.expires_at')
                    ->orderBy('l.pick_priority')
                    ->orderBy('c.created_at')
                    ->lockForUpdate()
                    ->get(['c.*', DB::raw('(c.quantity_current - COALESCE((SELECT SUM(a.quantity) FROM shipment_allocations a WHERE a.container_id = c.id AND a.status IN (\'ALLOCATED\', \'PICKED\')), 0)) as available_quantity')]);

                foreach ($candidates as $container) {
                    if ($required <= 0) {
                        break;
                    }
                    $quantity = min($required, (float) $container->available_quantity);
                    DB::table('shipment_allocations')->insert([
                        'sales_order_line_id' => $line->id,
                        'container_id' => $container->id,
                        'quantity' => $quantity,
                        'status' => 'ALLOCATED',
                        'allocated_by' => $request->user()->id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $required = round($required - $quantity, 4);
                }

                if ($required > 0) {
                    throw ValidationException::withMessages(['inventory' => "Inventario liberado insuficiente. Faltan {$required} {$line->unit}."]);
                }

                DB::table('sales_order_lines')->where('id', $line->id)->update([
                    'allocated_quantity' => $line->ordered_quantity,
                    'status' => 'ALLOCATED',
                    'updated_at' => now(),
                ]);
            }

            DB::table('sales_orders')->where('id', $order)->update([
                'status' => 'PICKING',
                'released_by' => $request->user()->id,
                'released_at' => $salesOrder->released_at ?? now(),
                'updated_at' => now(),
            ]);
            $this->audit->record($request, 'SALES_ORDER_FEFO_ALLOCATED', 'sales_orders', 'Reserva de inventario por fecha de caducidad y prioridad de ubicación', ['status' => $salesOrder->status], ['status' => 'PICKING'], $order);
        });

        return $this->success('Pedido liberado y reservado por FEFO.');
    }

    public function pickAllocation(Request $request, int $allocation): RedirectResponse
    {
        DB::transaction(function () use ($allocation, $request): void {
            $row = DB::table('shipment_allocations')->where('id', $allocation)->lockForUpdate()->first();
            abort_if($row === null || $row->status !== 'ALLOCATED', 422, 'La asignación no está disponible para surtido.');
            $container = Container::query()->lockForUpdate()->findOrFail((int) $row->container_id);
            abort_if(! $container->active || $container->quarantined || $container->status !== 'OK' || (float) $container->quantity_current < (float) $row->quantity, 422, 'El contenedor fue bloqueado o ya no tiene saldo suficiente.');
            DB::table('shipment_allocations')->where('id', $allocation)->update(['status' => 'PICKED', 'picked_by' => $request->user()->id, 'picked_at' => now(), 'updated_at' => now()]);
            $orderId = DB::table('sales_order_lines')->where('id', $row->sales_order_line_id)->value('sales_order_id');
            $pending = DB::table('shipment_allocations as a')->join('sales_order_lines as l', 'l.id', '=', 'a.sales_order_line_id')->where('l.sales_order_id', $orderId)->where('a.status', 'ALLOCATED')->exists();
            if (! $pending) {
                DB::table('sales_orders')->where('id', $orderId)->update(['status' => 'READY', 'updated_at' => now()]);
            }
            $this->audit->record($request, 'SHIPMENT_ALLOCATION_PICKED', 'shipment_allocations', "Surtido físico de {$container->serial}", ['status' => 'ALLOCATED'], ['status' => 'PICKED'], $allocation);
        });

        return $this->success('Contenedor confirmado en preparación.');
    }

    public function shipOrder(Request $request, int $order): RedirectResponse
    {
        $data = $request->validate([
            'carrier' => ['required', 'string', 'max:150'],
            'tracking_number' => ['nullable', 'string', 'max:150'],
            'vehicle' => ['nullable', 'string', 'max:100'],
            'seal' => ['nullable', 'string', 'max:100'],
        ]);

        $shipment = DB::transaction(function () use ($order, $data, $request): object {
            $salesOrder = DB::table('sales_orders')->where('id', $order)->lockForUpdate()->first();
            abort_if($salesOrder === null || $salesOrder->status !== 'READY', 422, 'Complete el surtido antes de embarcar.');
            $allocations = DB::table('shipment_allocations as a')->join('sales_order_lines as l', 'l.id', '=', 'a.sales_order_line_id')->where('l.sales_order_id', $order)->where('a.status', 'PICKED')->get(['a.*', 'l.unit']);
            abort_if($allocations->isEmpty(), 422, 'El pedido no tiene contenedores surtidos.');

            $number = $this->nextNumber('SHP', 'shipments');
            $shipmentId = DB::table('shipments')->insertGetId([
                'number' => $number,
                'sales_order_id' => $order,
                'status' => 'SHIPPED',
                ...$data,
                'created_by' => $request->user()->id,
                'shipped_by' => $request->user()->id,
                'shipped_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($allocations as $allocation) {
                $container = Container::query()->lockForUpdate()->findOrFail((int) $allocation->container_id);
                $quantity = (float) $allocation->quantity;
                abort_if(! $container->active || $container->quarantined || $container->status !== 'OK' || (float) $container->quantity_current < $quantity, 422, "El contenedor {$container->serial} ya no está disponible.");
                $remaining = round((float) $container->quantity_current - $quantity, 4);
                $container->forceFill(['quantity_current' => $remaining, 'active' => $remaining > 0, 'status' => $remaining > 0 ? 'OK' : 'SHIPPED'])->save();
                DB::table('shipment_items')->insert(['shipment_id' => $shipmentId, 'sales_order_line_id' => $allocation->sales_order_line_id, 'container_id' => $container->id, 'quantity' => $quantity, 'unit' => $allocation->unit, 'created_at' => now(), 'updated_at' => now()]);
                DB::table('shipment_allocations')->where('id', $allocation->id)->update(['status' => 'SHIPPED', 'updated_at' => now()]);
                DB::table('inventory_movements')->insert(['container_id' => $container->id, 'type' => 'SHIPMENT', 'quantity' => -$quantity, 'unit' => $allocation->unit, 'from_location_id' => $container->location_id, 'reference' => $number, 'notes' => "Pedido {$salesOrder->number}", 'user_id' => $request->user()->id, 'occurred_at' => now(), 'created_at' => now(), 'updated_at' => now()]);
            }

            DB::table('sales_order_lines')->where('sales_order_id', $order)->update(['shipped_quantity' => DB::raw('ordered_quantity'), 'status' => 'SHIPPED', 'updated_at' => now()]);
            DB::table('sales_orders')->where('id', $order)->update(['status' => 'SHIPPED', 'updated_at' => now()]);
            $this->audit->record($request, 'SHIPMENT_DISPATCHED', 'shipments', "Embarque {$number} confirmado", null, ['order' => $salesOrder->number, ...$data], $shipmentId);

            return (object) ['id' => $shipmentId, 'number' => $number];
        });

        return $this->success("Embarque {$shipment->number} confirmado y descontado del inventario.");
    }

    public function createReturn(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'shipment_id' => ['required', 'exists:shipments,id'],
            'container_id' => ['required', 'exists:containers,id'],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'reason' => ['required', 'string', 'max:180'],
            'disposition' => ['required', Rule::in(['QUARANTINE', 'REWORK', 'DESTROY', 'CREDIT'])],
            'notes' => ['nullable', 'string', 'max:1500'],
        ]);

        $return = DB::transaction(function () use ($data, $request): object {
            $shipment = DB::table('shipments as s')->join('sales_orders as o', 'o.id', '=', 's.sales_order_id')->where('s.id', $data['shipment_id'])->first(['s.id', 's.number', 'o.customer_id']);
            $shippedQuantity = (float) DB::table('shipment_items')->where('shipment_id', $data['shipment_id'])->where('container_id', $data['container_id'])->sum('quantity');
            abort_if($shipment === null || $shippedQuantity <= 0 || (float) $data['quantity'] > $shippedQuantity, 422, 'El contenedor o la cantidad no pertenecen al embarque.');
            $container = Container::query()->lockForUpdate()->findOrFail((int) $data['container_id']);
            $container->forceFill(['quarantined' => true, 'status' => 'HOLD'])->save();
            $number = $this->nextNumber('RET', 'customer_returns');
            $id = DB::table('customer_returns')->insertGetId([
                'number' => $number,
                'customer_id' => $shipment->customer_id,
                'shipment_id' => $shipment->id,
                'container_id' => $container->id,
                'quantity' => $data['quantity'],
                'unit' => $container->unit,
                'reason' => $data['reason'],
                'disposition' => $data['disposition'],
                'status' => 'OPEN',
                'notes' => $data['notes'] ?? null,
                'created_by' => $request->user()->id,
                'received_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $this->audit->record($request, 'CUSTOMER_RETURN_OPENED', 'customer_returns', $data['reason'], null, ['number' => $number, 'container' => $container->serial, ...$data], $id);

            return (object) ['number' => $number];
        });

        return $this->success("Devolución {$return->number} registrada; el contenedor quedó en cuarentena.");
    }

    public function createRecall(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['MOCK', 'REAL'])],
            'reference_type' => ['required', Rule::in(['CONTAINER', 'LOT', 'SUPPLIER_LOT'])],
            'reference' => ['required', 'string', 'max:150'],
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $recall = DB::transaction(function () use ($data, $request): object {
            $containerIds = $this->traceImpactedContainers($data['reference_type'], $data['reference']);
            if ($containerIds->isEmpty()) {
                throw ValidationException::withMessages(['reference' => 'No se encontró ningún contenedor o descendiente para la referencia.']);
            }

            $number = $this->nextNumber($data['type'] === 'REAL' ? 'RCL' : 'MCK', 'recall_events');
            $id = DB::table('recall_events')->insertGetId([
                'number' => $number,
                ...$data,
                'status' => 'INVESTIGATING',
                'initiated_by' => $request->user()->id,
                'started_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            foreach ($containerIds as $containerId) {
                $shipments = DB::table('shipment_items as i')->join('shipments as s', 's.id', '=', 'i.shipment_id')->join('sales_orders as o', 'o.id', '=', 's.sales_order_id')->where('i.container_id', $containerId)->get(['s.id as shipment_id', 'o.customer_id']);
                if ($shipments->isEmpty()) {
                    DB::table('recall_impacted_containers')->insert(['recall_event_id' => $id, 'container_id' => $containerId, 'action' => 'HOLD', 'created_at' => now(), 'updated_at' => now()]);
                } else {
                    foreach ($shipments->unique('shipment_id') as $shipment) {
                        DB::table('recall_impacted_containers')->insert(['recall_event_id' => $id, 'container_id' => $containerId, 'customer_id' => $shipment->customer_id, 'shipment_id' => $shipment->shipment_id, 'action' => 'NOTIFY', 'created_at' => now(), 'updated_at' => now()]);
                    }
                }
            }

            Container::query()->whereIn('id', $containerIds)->where('active', true)->update(['quarantined' => true, 'status' => 'HOLD', 'updated_at' => now()]);
            $this->audit->record($request, 'RECALL_INITIATED', 'recall_events', $data['reason'], null, ['number' => $number, 'impacted_containers' => $containerIds->count(), ...$data], $id);

            return (object) ['number' => $number, 'count' => $containerIds->count()];
        });

        return $this->success("Retiro {$recall->number} abierto con {$recall->count} contenedores trazados.");
    }

    public function closeRecall(Request $request, int $recall): RedirectResponse
    {
        $data = $request->validate(['closure_notes' => ['required', 'string', 'min:10', 'max:3000']]);
        $row = DB::table('recall_events')->where('id', $recall)->first();
        abort_if($row === null || $row->status === 'CLOSED', 422, 'El retiro no está disponible para cierre.');
        DB::table('recall_events')->where('id', $recall)->update(['status' => 'CLOSED', 'closure_notes' => $data['closure_notes'], 'closed_by' => $request->user()->id, 'closed_at' => now(), 'updated_at' => now()]);
        $this->audit->record($request, 'RECALL_CLOSED', 'recall_events', $data['closure_notes'], ['status' => $row->status], ['status' => 'CLOSED'], $recall);

        return $this->success('Retiro cerrado. Los contenedores continúan bloqueados hasta su disposición de Calidad.');
    }

    /** @return Collection<int, int> */
    private function traceImpactedContainers(string $referenceType, string $reference): Collection
    {
        $query = Container::query();
        match ($referenceType) {
            'CONTAINER' => $query->where('serial', $reference),
            'SUPPLIER_LOT' => $query->where('supplier_lot', $reference),
            default => $query->where(function ($inner) use ($reference): void {
                $inner->where('lot_code', $reference)->orWhere('production_lot', $reference);
            }),
        };
        $ids = $query->pluck('id')->map(fn ($id): int => (int) $id)->unique()->values();
        $frontier = $ids;
        while ($frontier->isNotEmpty()) {
            $children = DB::table('genealogy_events')->whereIn('parent_container_id', $frontier)->pluck('child_container_id')->map(fn ($id): int => (int) $id)->diff($ids)->unique()->values();
            $ids = $ids->merge($children)->unique()->values();
            $frontier = $children;
        }

        return $ids;
    }

    private function nextNumber(string $prefix, string $table): string
    {
        return $prefix.'-'.now()->format('Y').'-'.str_pad((string) (DB::table($table)->count() + 1), 5, '0', STR_PAD_LEFT);
    }

    private function success(string $message): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => $message]);

        return back();
    }
}
