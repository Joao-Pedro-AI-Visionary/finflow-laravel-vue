<?php

namespace App\Services;

use App\Models\CategoryRule;
use Illuminate\Support\Collection;

class RuleCategorizerService
{
    /**
     * @param  Collection<int, CategoryRule>|null  $preloadedRules
     * @return array{category: string, matched_rule: string|null}
     */
    public function classify(string $description, ?string $defaultType = 'expense', ?Collection $preloadedRules = null): array
    {
        $rules = $preloadedRules ?? CategoryRule::query()
            ->orderByDesc('priority')
            ->orderBy('id')
            ->get();

        $upperDescription = mb_strtoupper($description);

        foreach ($rules as $rule) {
            $pattern = mb_strtoupper(trim($rule->pattern));
            if ($pattern !== '' && str_contains($upperDescription, $pattern)) {
                return [
                    'category' => $rule->category,
                    'matched_rule' => $rule->pattern,
                ];
            }
        }

        return [
            'category' => $defaultType === 'income' ? 'Receitas Gerais' : 'Outros',
            'matched_rule' => null,
        ];
    }
}
