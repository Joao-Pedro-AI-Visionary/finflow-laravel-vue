<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FinflowApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_auto_categorizes_transactions_by_priority_rules_and_calculates_dashboard_totals(): void
    {
        // Create categorization rules (CA-01)
        $this->postJson('/api/v1/rules', [
            'pattern' => 'UBER',
            'category' => 'Transporte',
            'priority' => 10,
        ])->assertStatus(201);

        $this->postJson('/api/v1/rules', [
            'pattern' => 'AWS',
            'category' => 'Infraestrutura',
            'priority' => 20,
        ])->assertStatus(201);

        // Create income transaction
        $this->postJson('/api/v1/transactions', [
            'description' => 'Salário Desenvolvedor Pleno',
            'amount_cents' => 950000,
            'type' => 'income',
            'category' => 'Salário',
            'occurred_on' => '2026-10-05',
        ])->assertStatus(201);

        // Create expense without explicit category -> should match 'UBER' -> 'Transporte' (CA-01)
        $uberResponse = $this->postJson('/api/v1/transactions', [
            'description' => 'Uber Trip Sao Paulo',
            'amount_cents' => 4500,
            'type' => 'expense',
            'occurred_on' => '2026-10-10',
        ]);

        $uberResponse->assertStatus(201)
            ->assertJsonPath('data.category', 'Transporte')
            ->assertJsonPath('data.matched_rule', 'UBER');

        // Verify Dashboard aggregation (CA-03)
        $dashboard = $this->getJson('/api/v1/dashboard');
        $dashboard->assertStatus(200)
            ->assertJsonPath('data.summary.total_income_cents', 950000)
            ->assertJsonPath('data.summary.total_expense_cents', 4500)
            ->assertJsonPath('data.summary.net_balance_cents', 945500)
            ->assertJsonPath('data.by_category.Transporte', 4500);
    }

    public function test_imports_csv_statement_idempotently_skipping_duplicates_inside_transaction(): void
    {
        $this->postJson('/api/v1/rules', [
            'pattern' => 'IFOOD',
            'category' => 'Alimentação',
            'priority' => 15,
        ])->assertStatus(201);

        $csvPayload = implode("\n", [
            'date,description,amount_cents,type',
            '2026-10-12,IFOOD BR RESTAURANTE,6890,expense',
            '2026-10-15,FREELANCE VUE DASHBOARD,150000,income',
        ]);

        // First import: 2 imported, 0 duplicates (CA-02)
        $firstImport = $this->postJson('/api/v1/transactions/import-csv', [
            'csv_content' => $csvPayload,
        ]);

        $firstImport->assertStatus(200)
            ->assertJsonPath('data.imported_count', 2)
            ->assertJsonPath('data.skipped_duplicates', 0);

        // Second import of identical CSV: 0 imported, 2 duplicates skipped (CA-02)
        $secondImport = $this->postJson('/api/v1/transactions/import-csv', [
            'csv_content' => $csvPayload,
        ]);

        $secondImport->assertStatus(200)
            ->assertJsonPath('data.imported_count', 0)
            ->assertJsonPath('data.skipped_duplicates', 2);

        // Atomic rollback test: invalid 2nd line rolls back the entire batch and returns 422
        $invalidCsv = implode("\n", [
            'date,description,amount_cents,type',
            '2026-10-19,VALID ROW SHOULD ROLLBACK,5000,expense',
            '2026-10-20,INVALID AMOUNT ROW,not_a_number,expense',
        ]);

        $this->postJson('/api/v1/transactions/import-csv', [
            'csv_content' => $invalidCsv,
        ])->assertStatus(422);

        $this->assertDatabaseMissing('financial_transactions', [
            'description' => 'VALID ROW SHOULD ROLLBACK',
        ]);
    }

    public function test_supports_full_crud_on_transactions_and_rules_with_unique_pattern_constraint(): void
    {
        $rule = $this->postJson('/api/v1/rules', [
            'pattern' => 'NETFLIX',
            'category' => 'Streaming',
            'priority' => 15,
        ])->assertStatus(201)->json('data');

        // Duplicate rule pattern rejected with 422
        $this->postJson('/api/v1/rules', [
            'pattern' => 'NETFLIX',
            'category' => 'Duplicada',
            'priority' => 10,
        ])->assertStatus(422);

        // Update rule via PUT
        $this->putJson("/api/v1/rules/{$rule['id']}", [
            'category' => 'Lazer & Streaming',
            'priority' => 30,
        ])->assertStatus(200)
            ->assertJsonPath('data.category', 'Lazer & Streaming');

        // Create transaction, update via PUT, delete via DELETE
        $tx = $this->postJson('/api/v1/transactions', [
            'description' => 'NETFLIX ASSINATURA',
            'amount_cents' => 5590,
            'type' => 'expense',
            'occurred_on' => '2026-10-21',
        ])->assertStatus(201)->json('data');

        $this->putJson("/api/v1/transactions/{$tx['id']}", [
            'description' => 'NETFLIX PREMIUM 4K',
            'amount_cents' => 5990,
        ])->assertStatus(200)
            ->assertJsonPath('data.description', 'NETFLIX PREMIUM 4K')
            ->assertJsonPath('data.amount_cents', 5990);

        $this->deleteJson("/api/v1/transactions/{$tx['id']}")->assertStatus(204);
        $this->deleteJson("/api/v1/rules/{$rule['id']}")->assertStatus(204);
    }
}
