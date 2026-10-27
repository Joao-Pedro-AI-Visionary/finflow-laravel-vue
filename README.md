# FinFlow — Fullstack Laravel + Vue 3.5 Cashflow & Idempotent CSV Rule Engine

Aplicação **Fullstack** combinando **Laravel (Backend API REST, Transações ACID e Motor de Categorização por Regras)** e **Vue 3.5 (`<script setup>`, TypeScript, Pinia e Tailwind CSS v4)** para gestão de fluxo de caixa e importação idempotente de extratos CSV.

---

## Destaques Arquiteturais (Foco Vaga Pleno PHP/Laravel + Vue 3)

1. **Importação CSV Idempotente e Transacional (`CsvStatementImporter`):**
   - Processa lotes CSV dentro de `DB::transaction(...)`.
   - Gera `external_hash` determinístico (`SHA-256` sobre data, descrição normalizada, valor em centavos e tipo), garantindo que o reenvio do mesmo arquivo CSV nunca duplique lançamentos no banco.
2. **Motor de Categorização por Prioridade (`RuleCategorizerService`):**
   - Classifica transações automaticamente com base em regras ordenadas por `priority DESC` (ex.: `"UBER" → Transporte`, `"AWS" → Infraestrutura Cloud`, `"IFOOD" → Alimentação`).
3. **Valores Monetários em Centavos (`amount_cents`):**
   - Elimina erros de ponto flutuante (`IEEE 754`) armazenando e agregando valores inteiros em centavos no SQLite/MySQL e formatando em `BRL` (`Intl.NumberFormat`) na camada de apresentação Vue 3.
4. **Suíte Dupla de Testes Automatizados (Backend + Frontend):**
   - **Backend (PHPUnit):** Testa regras de prioridade, agregação do dashboard e idempotência de importação CSV (`tests/Feature/FinflowApiTest.php`).
   - **Frontend (Vitest + Vue Test Utils):** Testa a store Pinia (`useFinflowStore`) e a reatividade do componente `FinflowApp.vue` (`tests/Frontend/FinflowDashboard.spec.ts`).

---

## Endpoints da API (`api/v1`)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/v1/dashboard` | Retorna resumo (`total_income_cents`, `total_expense_cents`, `net_balance_cents`), soma por categoria, transações e regras |
| `POST` | `/api/v1/transactions` | Registra transação e classifica categoria automaticamente quando omitida |
| `POST` | `/api/v1/transactions/import-csv` | Importa lote CSV de forma atômica e idempotente (`imported_count`, `skipped_duplicates`) |
| `POST` | `/api/v1/rules` | Cria nova regra de categorização automática por padrão e prioridade |
| `DELETE` | `/api/v1/transactions/{id}` | Remove transação pelo ID |

---

## Como Executar

```bash
# 1. Instalar dependências PHP e JS
composer install
pnpm install

# 2. Configurar banco SQLite e popular seed inicial
cp -n .env.example .env
touch database/database.sqlite
php artisan key:generate
php artisan migrate --seed

# 3. Rodar testes Backend (Laravel / PHPUnit)
php artisan test

# 4. Rodar testes Frontend (Vue 3 / Vitest) e Typecheck
pnpm test
pnpm typecheck

# 5. Iniciar API Laravel e Frontend Vite
php artisan serve
pnpm dev
```
