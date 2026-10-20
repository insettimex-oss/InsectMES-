<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property float|null $min_value
 * @property float|null $max_value
 */
class EnvironmentalLimit extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'min_value' => 'float',
            'max_value' => 'float',
            'active' => 'boolean',
        ];
    }
}
