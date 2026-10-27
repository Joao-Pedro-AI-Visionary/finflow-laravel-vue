<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CategoryRule extends Model
{
    protected $fillable = [
        'pattern',
        'category',
        'priority',
    ];

    protected function casts(): array
    {
        return [
            'priority' => 'integer',
        ];
    }
}
