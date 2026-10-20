<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property string $code
 * @property float|null $min_value
 * @property float|null $max_value
 */
class QualitySpecification extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'min_value' => 'float',
            'max_value' => 'float',
            'target_value' => 'float',
            'critical' => 'boolean',
            'active' => 'boolean',
        ];
    }
}
