# Spec — FinFlow Fullstack Laravel + Vue 3 (`specs/finflow/spec.md`)

## Arquitetura Fullstack Unificada
- **Backend (`app/`):**
  - `Models/FinancialTransaction.php`: `id`, `external_hash` (unique), `description`, `amount_cents` (unsigned bigint), `type` (`income | expense`), `category`, `occurred_on` (date), `matched_rule` (nullable).
  - `Models/CategoryRule.php`: `id`, `pattern`, `category`, `priority` (int).
  - `Services/RuleCategorizerService.php`: Avalia regras ordenadas por `priority DESC` com match case-insensitive na descrição.
  - `Services/CsvStatementImporter.php`: Faz parsing de CSV dentro de `DB::transaction`, calcula `external_hash = hash('sha256', "{$date}|{$normalizedDesc}|{$amountCents}|{$type}")` para garantir idempotência.
- **Frontend (`resources/js/`):**
  - Vue 3.5 (`<script setup lang="ts">`) + Pinia 4 + Tailwind CSS v4.
  - `stores/useFinflowStore.ts`: Consome `/api/v1/dashboard`, `/api/v1/transactions`, `/api/v1/transactions/import-csv` e `/api/v1/rules`.
  - Testes automatizados duplos: `php artisan test` (Backend Feature/Unit) e `pnpm test` (`vitest run` para Store e Componentes Vue 3).
