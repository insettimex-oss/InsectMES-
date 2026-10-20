<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $code
 * @property string $description
 * @property float $value
 * @property string $unit
 * @property string $scope
 * @property string|null $source
 * @property bool $editable
 */
class Parameter extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['value' => 'float', 'editable' => 'boolean'];
    }
}
