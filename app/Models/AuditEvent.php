<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use LogicException;

class AuditEvent extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'before' => 'array',
            'after' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Los eventos de auditoría son inmutables.'));
        static::deleting(fn () => throw new LogicException('Los eventos de auditoría son inmutables.'));
    }
}
