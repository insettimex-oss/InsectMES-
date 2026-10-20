<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property string $area
 * @property int|null $work_center_id
 * @property int|null $input_part_id
 * @property int $output_part_id
 * @property float|null $duration_hours
 * @property-read WorkCenter|null $workCenter
 * @property-read Part|null $inputPart
 * @property-read Part $outputPart
 */
class Operation extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'duration_hours' => 'float'];
    }

    /** @return BelongsTo<WorkCenter, $this> */
    public function workCenter(): BelongsTo
    {
        return $this->belongsTo(WorkCenter::class);
    }

    /** @return BelongsTo<Part, $this> */
    public function inputPart(): BelongsTo
    {
        return $this->belongsTo(Part::class, 'input_part_id');
    }

    /** @return BelongsTo<Part, $this> */
    public function outputPart(): BelongsTo
    {
        return $this->belongsTo(Part::class, 'output_part_id');
    }
}
