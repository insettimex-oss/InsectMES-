<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class ProductionOrder extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'planned_quantity' => 'float',
            'completed_quantity' => 'float',
            'scheduled_start' => 'datetime',
            'scheduled_end' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Part, $this> */
    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }

    /** @return HasMany<ProductionOrderOperation, $this> */
    public function operations(): HasMany
    {
        return $this->hasMany(ProductionOrderOperation::class)->orderBy('sequence');
    }

    /** @return HasOne<MassBalance, $this> */
    public function massBalance(): HasOne
    {
        return $this->hasOne(MassBalance::class);
    }
}
