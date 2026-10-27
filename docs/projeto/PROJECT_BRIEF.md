# Project Brief — FinFlow (Fullstack Laravel + Vue 3 Cashflow & CSV Rule Engine)

## 1. Problema e Objetivo
Aplicação fullstack integrando **Laravel (Backend API REST + Transações ACID + Motor de Regras)** e **Vue 3.5 + TypeScript + Pinia (SPA Frontend)** para gestão financeira inteligente: importação de extratos CSV com deduplicação idempotente por hash, categorização automática por regras configuráveis e dashboard de fluxo de caixa em tempo real.

## 2. Classificação e Dial
- **Classificação:** MVP Fullstack para portfólio Pleno (Laravel + Vue 3).
- **Classe no Dial:** `db` / `backend` / `frontend` — Nível 2/3 (Contrato + TDD Backend + TDD Frontend + `test-gate` + `pr-review`).

## 3. Contratos da API (`api/v1`)
- `GET /api/v1/dashboard` — Retorna resumo consolidado (`total_income_cents`, `total_expense_cents`, `net_balance_cents`, `by_category`, `transactions`, `rules`).
- `POST /api/v1/transactions` — Registra uma nova transação (`description`, `amount_cents`, `type`: `income | expense`, `occurred_on`, `category` opcional — se omitida, o `RuleCategorizerService` classifica automaticamente).
- `POST /api/v1/transactions/import-csv` — Recebe texto CSV (`date,description,amount_cents,type`), processa dentro de `DB::transaction`, ignora linhas duplicadas via `external_hash` idempotente, classifica categorias automaticamente e retorna `{ imported_count, skipped_duplicates, transactions }`.
- `POST /api/v1/rules` — Cria nova regra de categorização automática (`pattern`, `category`, `priority`).
- `DELETE /api/v1/transactions/{id}` — Remove transação.

## 4. Critérios de Aceitação Verificáveis
- **CA-01 (Motor de Categorização):** Ao criar ou importar uma transação sem categoria explícita (ex.: `"UBER TRIP SAO PAULO"`), `RuleCategorizerService` atribui a categoria da regra de maior prioridade correspondente (`"Transporte"`), ou `"Outros"` se nenhuma regra casar.
- **CA-02 (Idempotência de Importação CSV):** Importar o mesmo arquivo CSV duas vezes seguidas insere os registros apenas na primeira execução (`imported_count: N, skipped_duplicates: 0`) e ignora 100% dos duplicados na segunda (`imported_count: 0, skipped_duplicates: N`).
- **CA-03 (Agregação de Fluxo de Caixa):** `GET /api/v1/dashboard` retorna `net_balance_cents = total_income_cents - total_expense_cents` e soma exata por categoria.
- **CA-04 (Frontend Vue 3 + Pinia):** A SPA em Vue 3 renderiza os cartões de telemetria financeira, filtra transações por categoria/tipo, permite lançar transação e importar lote CSV atualizando o estado reativo.
