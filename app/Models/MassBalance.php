<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MassBalance extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'substrate_input' => 'float',
            'water_input' => 'float',
            'biomass_input' => 'float',
            'larvae_output' => 'float',
            'frass_output' => 'float',
            'coproduct_output' => 'float',
            'evaporation' => 'float',
            'waste' => 'float',
            'variance' => 'float',
            'variance_percent' => 'float',
            'tolerance_percent' => 'float',
            'closed_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<ProductionOrder, $this> */
    public function productionOrder(): BelongsTo
    {
        return $this->belongsTo(ProductionOrder::class);
    }
}
