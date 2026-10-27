<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FinancialTransaction extends Model
{
    protected $fillable = [
        'external_hash',
        'description',
        'amount_cents',
        'type',
        'category',
        'matched_rule',
        'occurred_on',
    ];

    protected function casts(): array
    {
        return [
            'amount_cents' => 'integer',
            'occurred_on' => 'date:Y-m-d',
        ];
    }
}
