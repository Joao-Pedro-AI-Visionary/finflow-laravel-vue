<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CategoryRule;
use App\Models\FinancialTransaction;
use App\Services\CsvStatementImporter;
use App\Services\RuleCategorizerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use InvalidArgumentException;

class FinflowController extends Controller
{
    public function dashboard(): JsonResponse
    {
        $transactions = FinancialTransaction::query()
            ->orderByDesc('occurred_on')
            ->orderByDesc('id')
            ->limit(100)
            ->get();

        $totalIncomeCents = (int) FinancialTransaction::query()
            ->where('type', 'income')
            ->sum('amount_cents');

        $totalExpenseCents = (int) FinancialTransaction::query()
            ->where('type', 'expense')
            ->sum('amount_cents');

        $byCategory = FinancialTransaction::query()
            ->where('type', 'expense')
            ->selectRaw('category, SUM(amount_cents) as total_cents')
            ->groupBy('category')
            ->orderByDesc('total_cents')
            ->pluck('total_cents', 'category')
            ->map(fn ($v) => (int) $v)
            ->all();

        $rules = CategoryRule::query()
            ->orderByDesc('priority')
            ->orderBy('id')
            ->get();

        return response()->json([
            'data' => [
                'summary' => [
                    'total_income_cents' => $totalIncomeCents,
                    'total_expense_cents' => $totalExpenseCents,
                    'net_balance_cents' => $totalIncomeCents - $totalExpenseCents,
                    'transactions_count' => FinancialTransaction::query()->count(),
                ],
                'by_category' => $byCategory,
                'transactions' => $transactions,
                'rules' => $rules,
            ],
        ]);
    }

    public function storeTransaction(Request $request, RuleCategorizerService $categorizer): JsonResponse
    {
        $validated = $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'amount_cents' => ['required', 'integer', 'min:1'],
            'type' => ['required', 'in:income,expense'],
            'category' => ['nullable', 'string', 'max:80'],
            'occurred_on' => ['required', 'date'],
        ]);

        $category = $validated['category'] ?? null;
        $matchedRule = null;

        if (! $category || trim($category) === '') {
            $classification = $categorizer->classify($validated['description'], $validated['type']);
            $category = $classification['category'];
            $matchedRule = $classification['matched_rule'];
        }

        $externalHash = hash(
            'sha256',
            mb_strtolower("{$validated['occurred_on']}|{$validated['description']}|{$validated['amount_cents']}|{$validated['type']}|".Str::uuid())
        );

        $transaction = FinancialTransaction::query()->create([
            'external_hash' => $externalHash,
            'description' => $validated['description'],
            'amount_cents' => $validated['amount_cents'],
            'type' => $validated['type'],
            'category' => $category,
            'matched_rule' => $matchedRule,
            'occurred_on' => $validated['occurred_on'],
        ]);

        return response()->json([
            'data' => $transaction,
        ], 201);
    }

    public function updateTransaction(Request $request, int $id): JsonResponse
    {
        $tx = FinancialTransaction::query()->findOrFail($id);

        $validated = $request->validate([
            'description' => ['sometimes', 'required', 'string', 'max:255'],
            'amount_cents' => ['sometimes', 'required', 'integer', 'min:1'],
            'type' => ['sometimes', 'required', 'in:income,expense'],
            'category' => ['sometimes', 'required', 'string', 'max:80'],
            'occurred_on' => ['sometimes', 'required', 'date'],
        ]);

        $tx->update($validated);

        return response()->json([
            'data' => $tx->fresh(),
        ]);
    }

    public function importCsv(Request $request, CsvStatementImporter $importer): JsonResponse
    {
        $validated = $request->validate([
            'csv_content' => ['required', 'string', 'min:10'],
        ]);

        try {
            $result = $importer->import($validated['csv_content']);
        } catch (InvalidArgumentException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'data' => $result,
        ]);
    }

    public function storeRule(Request $request): JsonResponse
    {
        $request->merge([
            'pattern' => is_string($request->input('pattern'))
                ? mb_strtoupper(trim($request->input('pattern')))
                : $request->input('pattern'),
        ]);

        $validated = $request->validate([
            'pattern' => ['required', 'string', 'max:120', 'unique:category_rules,pattern'],
            'category' => ['required', 'string', 'max:80'],
            'priority' => ['nullable', 'integer', 'min:1', 'max:1000'],
        ]);

        $rule = CategoryRule::query()->create([
            'pattern' => $validated['pattern'],
            'category' => trim($validated['category']),
            'priority' => $validated['priority'] ?? 10,
        ]);

        return response()->json([
            'data' => $rule,
        ], 201);
    }

    public function updateRule(Request $request, int $id): JsonResponse
    {
        $rule = CategoryRule::query()->findOrFail($id);

        if ($request->has('pattern') && is_string($request->input('pattern'))) {
            $request->merge([
                'pattern' => mb_strtoupper(trim($request->input('pattern'))),
            ]);
        }

        $validated = $request->validate([
            'pattern' => [
                'sometimes',
                'required',
                'string',
                'max:120',
                Rule::unique('category_rules', 'pattern')->ignore($rule->id),
            ],
            'category' => ['sometimes', 'required', 'string', 'max:80'],
            'priority' => ['sometimes', 'required', 'integer', 'min:1', 'max:1000'],
        ]);

        $rule->update($validated);

        return response()->json([
            'data' => $rule->fresh(),
        ]);
    }

    public function destroyRule(int $id): JsonResponse
    {
        $rule = CategoryRule::query()->findOrFail($id);
        $rule->delete();

        return response()->json(null, 204);
    }

    public function destroyTransaction(int $id): JsonResponse
    {
        $tx = FinancialTransaction::query()->findOrFail($id);
        $tx->delete();

        return response()->json(null, 204);
    }
}
