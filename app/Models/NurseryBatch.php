<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $container_id
 * @property string $rack
 * @property int $level
 * @property string $status
 * @property Carbon|null $closed_at
 * @property-read Container $container
 */
class NurseryBatch extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['recipe' => 'array', 'started_at' => 'datetime', 'level_at' => 'datetime', 'closed_at' => 'datetime'];
    }

    /** @return BelongsTo<Container, $this> */
    public function container(): BelongsTo
    {
        return $this->belongsTo(Container::class);
    }
}
