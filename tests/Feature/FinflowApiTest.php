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
    }
}
