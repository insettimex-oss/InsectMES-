<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $serial
 * @property int $part_id
 * @property int|null $location_id
 * @property string $status
 * @property string $origin
 * @property float $quantity_current
 * @property string $unit
 * @property bool $active
 * @property-read Part $part
 * @property-read Location|null $location
 */
class Container extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'active' => 'boolean',
            'quarantined' => 'boolean',
            'quantity_current' => 'float',
            'production_lot' => 'date:Y-m-d',
            'expires_at' => 'date:Y-m-d',
            'metadata' => 'array',
        ];
    }

    /** @return BelongsTo<Part, $this> */
    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }

    /** @return BelongsTo<Location, $this> */
    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }
}
