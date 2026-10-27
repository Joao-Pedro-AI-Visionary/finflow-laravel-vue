<?php

namespace App\Services;

use App\Models\CategoryRule;
use App\Models\FinancialTransaction;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CsvStatementImporter
{
    public function __construct(
        private readonly RuleCategorizerService $categorizer,
    ) {}

    /**
     * @return array{imported_count: int, skipped_duplicates: int, transactions: array<int, FinancialTransaction>}
     */
    public function import(string $csvContent): array
    {
        $lines = preg_split('/\r\n|\r|\n/', trim($csvContent));
        if (! $lines || count($lines) < 2) {
            throw new InvalidArgumentException('O conteúdo CSV deve conter cabeçalho e pelo menos uma linha de transação.');
        }

        $rules = CategoryRule::query()->orderByDesc('priority')->orderBy('id')->get();
        $imported = [];
        $skippedDuplicates = 0;

        DB::transaction(function () use ($lines, $rules, &$imported, &$skippedDuplicates) {
            foreach (array_slice($lines, 1) as $index => $rawLine) {
                $trimmed = trim($rawLine);
                if ($trimmed === '') {
                    continue;
                }

                $columns = str_getcsv($trimmed);
                if (count($columns) < 4) {
                    throw new InvalidArgumentException('Linha CSV inválida na posição '.($index + 2));
                }

                [$occurredOn, $description, $amountCentsRaw, $type] = array_map('trim', $columns);
                $normalizedType = in_array($type, ['income', 'expense'], true) ? $type : 'expense';
                $amountCents = max(1, (int) $amountCentsRaw);

                $externalHash = hash(
                    'sha256',
                    strtolower("{$occurredOn}|{$description}|{$amountCents}|{$normalizedType}")
                );

                if (FinancialTransaction::query()->where('external_hash', $externalHash)->exists()) {
                    $skippedDuplicates++;

                    continue;
                }

                $classification = $this->categorizer->classify($description, $normalizedType, $rules);

                $created = FinancialTransaction::query()->create([
                    'external_hash' => $externalHash,
                    'description' => $description,
                    'amount_cents' => $amountCents,
                    'type' => $normalizedType,
                    'category' => $classification['category'],
                    'matched_rule' => $classification['matched_rule'],
                    'occurred_on' => $occurredOn,
                ]);

                $imported[] = $created;
            }
        });

        return [
            'imported_count' => count($imported),
            'skipped_duplicates' => $skippedDuplicates,
            'transactions' => $imported,
        ];
    }
}
