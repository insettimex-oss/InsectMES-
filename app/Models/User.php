<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name
 * @property string $email
 * @property Carbon|null $email_verified_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
#[Fillable(['name', 'email', 'password', 'role', 'role_id', 'company', 'is_active', 'must_change_password', 'email_verified_at'])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token'])]
class User extends Authenticatable implements MustVerifyEmail, PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /** @return BelongsTo<Role, $this> */
    public function assignedRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    /** @return BelongsToMany<Permission, $this> */
    public function permissionOverrides(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'user_permission_overrides')
            ->withPivot('allowed')
            ->withTimestamps();
    }

    /** @return list<string> */
    public function effectivePermissionKeys(): array
    {
        if ($this->isAdministrator()) {
            return array_values(Permission::query()->orderBy('key')->pluck('key')->map(fn ($key): string => (string) $key)->all());
        }

        $role = $this->assignedRole()->first() ?? Role::query()->where('slug', $this->role)->first();
        $roleKeys = $role?->permissions()->pluck('permissions.key')->map(fn ($key): string => (string) $key)->all() ?? [];
        $keys = array_fill_keys($roleKeys, true);

        foreach (DB::table('user_permission_overrides as o')->join('permissions as p', 'p.id', '=', 'o.permission_id')->where('o.user_id', $this->id)->pluck('o.allowed', 'p.key') as $key => $allowed) {
            if ((bool) $allowed) {
                $keys[(string) $key] = true;
            } else {
                unset($keys[(string) $key]);
            }
        }

        $permissions = array_keys($keys);
        sort($permissions);

        return $permissions;
    }

    public function hasPermission(string $permission): bool
    {
        return $this->is_active && ($this->isAdministrator() || in_array($permission, $this->effectivePermissionKeys(), true));
    }

    public function isAdministrator(): bool
    {
        return $this->is_active && ($this->roleSlug() === 'admin');
    }

    public function roleName(): string
    {
        return (string) ($this->assignedRole()->value('name') ?? $this->role);
    }

    public function roleSlug(): string
    {
        return (string) ($this->assignedRole()->value('slug') ?? $this->role);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'must_change_password' => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }
}
