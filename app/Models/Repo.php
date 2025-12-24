<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Repo extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'github_repo_id',
        'name',
        'description',
        'url',
        'language',
        'stars',
        'user_notes',
        'folder',
        'is_own_repo',
        'is_featured',
    ];

    protected $casts = [
        'is_own_repo' => 'boolean',
        'is_featured' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
