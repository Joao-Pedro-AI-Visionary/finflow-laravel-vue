<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { CategoryRuleDto, FinancialTransactionDto } from '@/contracts'
import { formatBrlCents, useFinflowStore } from '@/stores/useFinflowStore'

const store = useFinflowStore()

const csvContent = ref(
  [
    'date,description,amount_cents,type',
    '2026-10-22,UBER TRIP REUNIAO CLIENTE,3890,expense',
    '2026-10-23,IFOOD JANTAR DEPLOY,6400,expense'
  ].join('\n')
)

// Lei de Hick (02): Progressive Disclosure para lançamento rápido manual
const showQuickEntry = ref(false)
const quickDesc = ref('')
const quickAmountInput = ref('')
const quickType = ref<'income' | 'expense'>('expense')

// Estado de edição de transação (CRUD - Update)
const editingTxId = ref<number | null>(null)
const editTxDesc = ref('')
const editTxAmountCents = ref(0)
const editTxCategory = ref('')

// Estado de regra de categorização (CRUD - Create & Update)
const newRulePattern = ref('')
const newRuleCategory = ref('')
const newRulePriority = ref(25)
const editingRuleId = ref<number | null>(null)

// Efeito Zeigarnik (10) & Gradiente de Meta (11): Taxa de poupança / saúde operacional
const savingsRatePct = computed(() => {
  const income = store.summary.total_income_cents
  if (income <= 0) return 0
  return Math.max(0, Math.round((store.summary.net_balance_cents / income) * 100))
})

onMounted(async () => {
  await store.loadDashboard()
})

// Lei de Postel (16) & Lei de Tesler (15): Aceita "R$ 45,90", "45.90" ou "4590" e converte para centavos
function parseFlexibleCurrencyToCents(raw: string): number {
  const cleaned = raw.replace(/[R$\s]/gi, '').trim()
  if (!cleaned) return 0
  if (cleaned.includes(',') || cleaned.includes('.')) {
    const normalized = cleaned.replace(/\./g, '').replace(',', '.')
    const floatVal = Number.parseFloat(normalized)
    return Number.isFinite(floatVal) ? Math.round(floatVal * 100) : 0
  }
  const intVal = Number.parseInt(cleaned, 10)
  return Number.isFinite(intVal) ? intVal : 0
}

async function handleQuickTransaction() {
  const amountCents = parseFlexibleCurrencyToCents(quickAmountInput.value)
  if (!quickDesc.value.trim() || amountCents < 1) {
    store.errorFeedback = 'Constraint 422: Informe descrição e valor maior que zero.'
    return
  }

  try {
    await store.addTransaction({
      description: quickDesc.value.trim(),
      amount_cents: amountCents,
      type: quickType.value,
      occurred_on: new Date().toISOString().slice(0, 10)
    })
    quickDesc.value = ''
    quickAmountInput.value = ''
    showQuickEntry.value = false
  } catch {
    // store.errorFeedback already populated
  }
}

function startEditTransaction(tx: FinancialTransactionDto) {
  editingTxId.value = tx.id
  editTxDesc.value = tx.description
  editTxAmountCents.value = tx.amount_cents
  editTxCategory.value = tx.category
}

async function saveEditTransaction(id: number) {
  if (!editTxDesc.value.trim() || editTxAmountCents.value < 1) {
    store.errorFeedback = 'Constraint 422: Descrição e valor válido são obrigatórios.'
    return
  }
  try {
    await store.editTransaction(id, {
      description: editTxDesc.value.trim(),
      amount_cents: Number(editTxAmountCents.value),
      category: editTxCategory.value.trim() || 'Outros'
    })
    editingTxId.value = null
  } catch {
    // store.errorFeedback already populated
  }
}

async function handleDeleteTransaction(id: number) {
  try {
    await store.removeTransaction(id)
  } catch {
    // store.errorFeedback already populated
  }
}

async function handleImportCsv() {
  if (!csvContent.value.trim()) return
  try {
    await store.submitCsvImport(csvContent.value)
  } catch {
    // store.errorFeedback already populated
  }
}

function startEditRule(rule: CategoryRuleDto) {
  editingRuleId.value = rule.id
  newRulePattern.value = rule.pattern
  newRuleCategory.value = rule.category
  newRulePriority.value = rule.priority
}

async function handleSaveRule() {
  if (!newRulePattern.value.trim() || !newRuleCategory.value.trim()) {
    store.errorFeedback = 'Constraint 422: Padrão e categoria da regra são obrigatórios.'
    return
  }
  try {
    if (editingRuleId.value !== null) {
      await store.editRule(editingRuleId.value, {
        pattern: newRulePattern.value.trim(),
        category: newRuleCategory.value.trim(),
        priority: Number(newRulePriority.value) || 10
      })
      editingRuleId.value = null
    } else {
      await store.addRule({
        pattern: newRulePattern.value.trim(),
        category: newRuleCategory.value.trim(),
        priority: Number(newRulePriority.value) || 10
      })
    }
    newRulePattern.value = ''
    newRuleCategory.value = ''
    newRulePriority.value = 25
  } catch {
    // store.errorFeedback already populated
  }
}

async function handleDeleteRule(id: number) {
  try {
    await store.removeRule(id)
  } catch {
    // store.errorFeedback already populated
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased selection:bg-sky-100 selection:text-sky-900">
    <!-- Header (Dribbble High-End Editorial Fintech) -->
    <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div class="flex items-center gap-3">
          <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 font-mono text-sm font-bold text-sky-400 shadow-xs">
            FF
          </div>
          <div>
            <span class="font-mono text-[11px] font-bold tracking-wider text-sky-600 uppercase">
              FINFLOW // LARAVEL 12 + VUE 3.5
            </span>
            <h1 class="text-lg font-bold text-slate-900">
              Intelligent Cashflow & Idempotent CSV Rule Engine
            </h1>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-mono text-xs font-semibold text-emerald-700">
            Taxa de Retenção: {{ savingsRatePct }}%
          </span>
          <!-- Lei de Fitts (01) & Lei de Hick (02): Alvo 48px + Revelação Progressiva -->
          <button
            type="button"
            data-testid="toggle-quick-entry-btn"
            class="min-h-[44px] rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 transition"
            @click="showQuickEntry = !showQuickEntry"
          >
            {{ showQuickEntry ? 'Fechar Lançamento' : '+ Lançamento Rápido' }}
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <!-- Alerta Global de Constraint / Validação -->
      <div
        v-if="store.errorFeedback"
        data-testid="finflow-error-alert"
        role="alert"
        class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 font-mono text-xs font-medium text-rose-700 shadow-xs"
      >
        {{ store.errorFeedback }}
      </div>

      <!-- Quick Manual Transaction Form (Progressive Disclosure - Lei de Hick 02 & Lei de Postel 16) -->
      <form
        v-if="showQuickEntry"
        data-testid="quick-entry-form"
        class="grid grid-cols-1 gap-3 rounded-2xl border border-sky-200 bg-white p-5 shadow-sm sm:grid-cols-4"
        @submit.prevent="handleQuickTransaction"
      >
        <input
          v-model="quickDesc"
          data-testid="quick-desc-input"
          type="text"
          placeholder="Descrição (ex: UBER AEROPORTO)"
          class="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 shadow-2xs"
        />
        <input
          v-model="quickAmountInput"
          data-testid="quick-amount-input"
          type="text"
          placeholder="Valor (ex: 45,90 ou 4590)"
          class="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 shadow-2xs"
        />
        <select
          v-model="quickType"
          data-testid="quick-type-select"
          class="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 focus:bg-white focus:border-sky-600 shadow-2xs"
        >
          <option value="expense">Despesa (-)</option>
          <option value="income">Receita (+)</option>
        </select>
        <button
          type="submit"
          data-testid="quick-submit-btn"
          class="min-h-[44px] rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition shadow-xs"
        >
          Registrar (Auto-Categoria)
        </button>
      </form>

      <!-- KPI Telemetry Cards (Lei de Miller 05 & Conectividade Uniforme 14) -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="rounded-2xl border border-slate-200/90 bg-white p-5.5 shadow-xs">
          <p class="font-mono text-xs font-semibold text-slate-500 uppercase">Receitas Acumuladas</p>
          <p
            data-testid="total-income"
            class="mt-2 font-mono text-2xl font-bold text-emerald-600"
          >
            {{ formatBrlCents(store.summary.total_income_cents) }}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200/90 bg-white p-5.5 shadow-xs">
          <p class="font-mono text-xs font-semibold text-slate-500 uppercase">Despesas Categorizadas</p>
          <p
            data-testid="total-expense"
            class="mt-2 font-mono text-2xl font-bold text-rose-600"
          >
            {{ formatBrlCents(store.summary.total_expense_cents) }}
          </p>
        </div>

        <div class="rounded-2xl border border-slate-200/90 bg-white p-5.5 shadow-xs">
          <p class="font-mono text-xs font-semibold text-sky-700 uppercase">Saldo Líquido Operacional</p>
          <p
            data-testid="net-balance"
            class="mt-2 font-mono text-2xl font-black text-slate-900"
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
            class="space-y-3.5 rounded-2xl border border-slate-200/90 bg-white p-5.5 shadow-xs"
            @submit.prevent="handleImportCsv"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-base font-bold text-slate-900">
                Importador CSV Idempotente
              </h2>
              <span class="rounded-full bg-sky-50 border border-sky-200 px-2.5 py-0.5 font-mono text-[10px] font-bold text-sky-700">
                SHA-256 Hash Guard
              </span>
            </div>
            <p class="text-xs text-slate-500 leading-relaxed">
              Cole linhas no formato <code class="font-mono font-semibold text-slate-800 bg-slate-100 px-1 py-0.5 rounded">date,description,amount_cents,type</code>. Linhas repetidas são ignoradas automaticamente pelo backend Laravel.
            </p>
            <textarea
              v-model="csvContent"
              data-testid="csv-textarea"
              rows="4"
              class="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 focus:bg-white focus:border-sky-600 focus:ring-2 focus:ring-sky-500/20 shadow-2xs"
            ></textarea>
            <!-- Efeito Von Restorff (07) & Lei de Fitts (01): CTA Primário exclusivo com 48px -->
            <button
              type="submit"
              data-testid="csv-submit-btn"
              class="min-h-[48px] w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-xs"
            >
              Processar Lote CSV em Transação
            </button>
            <p
              v-if="store.lastImportFeedback"
              data-testid="import-feedback"
              class="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 font-mono text-xs font-semibold text-emerald-800 shadow-2xs"
            >
              {{ store.lastImportFeedback }}
            </p>
          </form>

          <!-- Automatic Categorization Rules (Full CRUD) -->
          <section class="space-y-3.5 rounded-2xl border border-slate-200/90 bg-white p-5.5 shadow-xs">
            <h2 class="text-base font-bold text-slate-900">
              Motor de Regras de Categorização ({{ store.rules.length }})
            </h2>
            <form
              data-testid="rule-form"
              class="grid grid-cols-1 gap-2 sm:grid-cols-3"
              @submit.prevent="handleSaveRule"
            >
              <input
                v-model="newRulePattern"
                data-testid="rule-pattern-input"
                type="text"
                placeholder="Padrão (ex: NETFLIX)"
                class="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-sky-600 shadow-2xs"
              />
              <input
                v-model="newRuleCategory"
                data-testid="rule-category-input"
                type="text"
                placeholder="Categoria"
                class="min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 focus:bg-white focus:border-sky-600 shadow-2xs"
              />
              <button
                type="submit"
                data-testid="rule-submit-btn"
                class="min-h-[44px] rounded-xl border border-sky-300 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-100 transition shadow-2xs"
              >
                {{ editingRuleId !== null ? 'Salvar Regra' : '+ Criar Regra' }}
              </button>
            </form>

            <div class="space-y-2 pt-2">
              <div
                v-for="rule in store.rules"
                :key="rule.id"
                :data-testid="`rule-item-${rule.pattern}`"
                class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 font-mono text-xs text-slate-800 shadow-2xs"
              >
                <span>
                  <strong class="text-sky-700">{{ rule.pattern }}</strong> →
                  <span :data-testid="`rule-cat-${rule.pattern}`">{{ rule.category }}</span>
                  <span class="text-slate-400 font-normal"> (P{{ rule.priority }})</span>
                </span>
                <div class="flex gap-1.5">
                  <button
                    type="button"
                    :data-testid="`edit-rule-${rule.pattern}`"
                    class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
                    @click="startEditRule(rule)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    :data-testid="`delete-rule-${rule.pattern}`"
                    class="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 shadow-2xs"
                    @click="handleDeleteRule(rule.id)"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </section>
        </aside>

        <!-- Right Column: Transactions Ledger (Full CRUD) -->
        <section class="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-5.5 shadow-xs lg:col-span-7">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h2 class="text-base font-bold text-slate-900">
              Livro-Razão de Transações ({{ store.filteredTransactions.length }})
            </h2>
            <div class="flex gap-1.5">
              <button
                type="button"
                data-testid="filter-type-all"
                class="min-h-[40px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition"
                :class="
                  store.typeFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                "
                @click="store.typeFilter = 'all'"
              >
                Todas
              </button>
              <button
                type="button"
                data-testid="filter-type-income"
                class="min-h-[40px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition"
                :class="
                  store.typeFilter === 'income'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                "
                @click="store.typeFilter = 'income'"
              >
                Receitas
              </button>
              <button
                type="button"
                data-testid="filter-type-expense"
                class="min-h-[40px] rounded-xl px-3.5 py-1.5 text-xs font-semibold transition"
                :class="
                  store.typeFilter === 'expense'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                "
                @click="store.typeFilter = 'expense'"
              >
                Despesas
              </button>
            </div>
          </div>

          <div class="divide-y divide-slate-100">
            <article
              v-for="tx in store.filteredTransactions"
              :key="tx.id"
              :data-testid="`tx-row-${tx.id}`"
              class="py-3.5"
            >
              <div
                v-if="editingTxId === tx.id"
                class="grid grid-cols-1 gap-2.5 rounded-xl border border-sky-300 bg-sky-50/50 p-3 sm:grid-cols-4"
              >
                <input
                  v-model="editTxDesc"
                  :data-testid="`edit-tx-desc-${tx.id}`"
                  type="text"
                  class="min-h-[40px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 shadow-2xs"
                />
                <input
                  v-model.number="editTxAmountCents"
                  :data-testid="`edit-tx-amount-${tx.id}`"
                  type="number"
                  min="1"
                  class="min-h-[40px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 shadow-2xs"
                />
                <input
                  v-model="editTxCategory"
                  :data-testid="`edit-tx-category-${tx.id}`"
                  type="text"
                  class="min-h-[40px] rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-900 shadow-2xs"
                />
                <div class="flex gap-1.5">
                  <button
                    type="button"
                    :data-testid="`save-tx-${tx.id}`"
                    class="rounded-lg bg-sky-600 px-3 py-1 text-xs font-semibold text-white shadow-2xs"
                    @click="saveEditTransaction(tx.id)"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-2xs"
                    @click="editingTxId = null"
                  >
                    Cancelar
                  </button>
                </div>
              </div>

              <div v-else class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-mono text-xs text-slate-400">{{ tx.occurred_on }}</span>
                    <span class="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {{ tx.category }}
                    </span>
                    <span
                      v-if="tx.matched_rule"
                      class="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-mono text-[10px] font-bold text-sky-700"
                    >
                      regra: {{ tx.matched_rule }}
                    </span>
                  </div>
                  <p
                    :data-testid="`tx-desc-${tx.id}`"
                    class="mt-1 text-sm font-bold text-slate-900"
                  >
                    {{ tx.description }}
                  </p>
                </div>

                <div class="flex items-center gap-3">
                  <span
                    class="font-mono text-sm font-bold"
                    :class="tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'"
                  >
                    {{ tx.type === 'income' ? '+' : '-' }} {{ formatBrlCents(tx.amount_cents) }}
                  </span>
                  <button
                    type="button"
                    :data-testid="`edit-tx-btn-${tx.id}`"
                    class="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                    @click="startEditTransaction(tx)"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    :data-testid="`delete-tx-btn-${tx.id}`"
                    class="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                    @click="handleDeleteTransaction(tx.id)"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
