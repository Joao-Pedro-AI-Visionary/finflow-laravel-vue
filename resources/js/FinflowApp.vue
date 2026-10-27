<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { formatBrlCents, useFinflowStore } from '@/stores/useFinflowStore'

const store = useFinflowStore()

const csvContent = ref(
  [
    'date,description,amount_cents,type',
    '2026-10-22,UBER TRIP REUNIAO CLIENTE,3890,expense',
    '2026-10-23,IFOOD JANTAR DEPLOY,6400,expense'
  ].join('\n')
)

const newRulePattern = ref('')
const newRuleCategory = ref('')
const newRulePriority = ref(25)

onMounted(async () => {
  await store.loadDashboard()
})

async function handleImportCsv() {
  if (!csvContent.value.trim()) return
  await store.submitCsvImport(csvContent.value)
}

async function handleCreateRule() {
  if (!newRulePattern.value.trim() || !newRuleCategory.value.trim()) return
  await store.addRule({
    pattern: newRulePattern.value.trim(),
    category: newRuleCategory.value.trim(),
    priority: Number(newRulePriority.value) || 10
  })
  newRulePattern.value = ''
  newRuleCategory.value = ''
}
</script>

<template>
  <div class="min-h-screen bg-[#090D16] text-slate-100">
    <!-- Header -->
    <header class="border-b border-slate-800/80 bg-[#0F172A]/95">
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-500/10 font-mono text-sm font-bold text-cyan-300">
            FF
          </div>
          <div>
            <span class="font-mono text-xs font-bold tracking-wider text-cyan-400">
              FINFLOW // LARAVEL 12 + VUE 3.5
            </span>
            <h1 class="text-lg font-bold text-slate-50">
              Intelligent Cashflow & Idempotent CSV Rule Engine
            </h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <span class="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs text-emerald-300">
            DB::transaction + SHA-256 Deduplication
          </span>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <!-- KPI Telemetry Cards -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
          <p class="font-mono text-xs text-slate-400 uppercase">Receitas Acumuladas</p>
          <p class="mt-2 font-mono text-2xl font-bold text-emerald-400">
            {{ formatBrlCents(store.summary.total_income_cents) }}
          </p>
        </div>

        <div class="rounded-xl border border-slate-800 bg-[#0F172A] p-5">
          <p class="font-mono text-xs text-slate-400 uppercase">Despesas Categorizadas</p>
          <p class="mt-2 font-mono text-2xl font-bold text-rose-400">
            {{ formatBrlCents(store.summary.total_expense_cents) }}
          </p>
        </div>

        <div class="rounded-xl border border-cyan-500/40 bg-[#0F172A] p-5">
          <p class="font-mono text-xs text-cyan-300 uppercase">Saldo Líquido Operacional</p>
          <p
            data-testid="net-balance"
            class="mt-2 font-mono text-2xl font-bold text-slate-50"
          >
            {{ formatBrlCents(store.summary.net_balance_cents) }}
          </p>
        </div>
      </section>

      <!-- Workspace Grid -->
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <!-- Left Column: Idempotent CSV Importer & Rule Engine -->
        <aside class="space-y-6 lg:col-span-5">
          <form
            data-testid="csv-import-form"
            class="space-y-3 rounded-xl border border-slate-800 bg-[#0F172A] p-5"
            @submit.prevent="handleImportCsv"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-base font-semibold text-slate-100">
                Importador CSV Idempotente
              </h2>
              <span class="font-mono text-[11px] text-cyan-400">SHA-256 Hash Guard</span>
            </div>
            <p class="text-xs text-slate-400">
              Cole linhas no formato <code class="text-slate-200">date,description,amount_cents,type</code>. Linhas repetidas são ignoradas automaticamente pelo backend Laravel.
            </p>
            <textarea
              v-model="csvContent"
              data-testid="csv-textarea"
              rows="4"
              class="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-slate-200"
            ></textarea>
            <button
              type="submit"
              class="min-h-[44px] w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Processar Lote CSV em Transação
            </button>
            <p
              v-if="store.lastImportFeedback"
              data-testid="import-feedback"
              class="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 font-mono text-xs text-emerald-300"
            >
              {{ store.lastImportFeedback }}
            </p>
          </form>

          <!-- Automatic Categorization Rules -->
          <section class="space-y-3 rounded-xl border border-slate-800 bg-[#0F172A] p-5">
            <h2 class="text-base font-semibold text-slate-100">
              Motor de Regras de Categorização ({{ store.rules.length }})
            </h2>
            <form class="grid grid-cols-1 gap-2 sm:grid-cols-3" @submit.prevent="handleCreateRule">
              <input
                v-model="newRulePattern"
                type="text"
                placeholder="Padrão (ex: NETFLIX)"
                class="min-h-[44px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
              />
              <input
                v-model="newRuleCategory"
                type="text"
                placeholder="Categoria"
                class="min-h-[44px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100"
              />
              <button
                type="submit"
                class="min-h-[44px] rounded-lg border border-cyan-500/40 bg-cyan-500/15 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/25"
              >
                + Criar Regra
              </button>
            </form>

            <div class="flex flex-wrap gap-2 pt-2">
              <span
                v-for="rule in store.rules"
                :key="rule.id"
                class="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-xs text-slate-300"
              >
                <strong class="text-cyan-400">{{ rule.pattern }}</strong> → {{ rule.category }} (P{{ rule.priority }})
              </span>
            </div>
          </section>
        </aside>

        <!-- Right Column: Transactions Ledger -->
        <section class="space-y-4 rounded-xl border border-slate-800 bg-[#0F172A] p-5 lg:col-span-7">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-base font-semibold text-slate-100">
              Livro-Razão de Transações ({{ store.filteredTransactions.length }})
            </h2>
            <div class="flex gap-2">
              <button
                type="button"
                data-testid="filter-type-all"
                class="min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold"
                :class="
                  store.typeFilter === 'all'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'border border-slate-800 bg-slate-900 text-slate-300'
                "
                @click="store.typeFilter = 'all'"
              >
                Todas
              </button>
              <button
                type="button"
                data-testid="filter-type-income"
                class="min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold"
                :class="
                  store.typeFilter === 'income'
                    ? 'bg-emerald-500 text-slate-950'
                    : 'border border-slate-800 bg-slate-900 text-slate-300'
                "
                @click="store.typeFilter = 'income'"
              >
                Receitas
              </button>
              <button
                type="button"
                data-testid="filter-type-expense"
                class="min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold"
                :class="
                  store.typeFilter === 'expense'
                    ? 'bg-rose-500 text-slate-950'
                    : 'border border-slate-800 bg-slate-900 text-slate-300'
                "
                @click="store.typeFilter = 'expense'"
              >
                Despesas
              </button>
            </div>
          </div>

          <div class="divide-y divide-slate-800/80">
            <article
              v-for="tx in store.filteredTransactions"
              :key="tx.id"
              class="flex items-center justify-between gap-4 py-3.5"
            >
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-mono text-xs text-slate-400">{{ tx.occurred_on }}</span>
                  <span class="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-200">
                    {{ tx.category }}
                  </span>
                  <span
                    v-if="tx.matched_rule"
                    class="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-300"
                  >
                    regra: {{ tx.matched_rule }}
                  </span>
                </div>
                <p class="mt-1 text-sm font-medium text-slate-100">
                  {{ tx.description }}
                </p>
              </div>

              <span
                class="font-mono text-sm font-bold"
                :class="tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'"
              >
                {{ tx.type === 'income' ? '+' : '-' }} {{ formatBrlCents(tx.amount_cents) }}
              </span>
            </article>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
