<?php

namespace App\Services;

use App\Models\AuditEvent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditService
{
    /** @param array<string, mixed>|null $before
     * @param  array<string, mixed>|null  $after
     */
    public function record(
        Request $request,
        string $event,
        Model|string $auditable,
        string $reason,
        ?array $before = null,
        ?array $after = null,
        int|string|null $auditableId = null,
    ): AuditEvent {
        return AuditEvent::create([
            'user_id' => $request->user()?->id,
            'event' => $event,
            'auditable_type' => $auditable instanceof Model ? $auditable::class : $auditable,
            'auditable_id' => $auditable instanceof Model ? (string) $auditable->getKey() : ($auditableId !== null ? (string) $auditableId : null),
            'before' => $before,
            'after' => $after,
            'reason' => $reason,
            'ip_address' => $request->ip(),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 500),
            'occurred_at' => now(),
        ]);
    }
}
