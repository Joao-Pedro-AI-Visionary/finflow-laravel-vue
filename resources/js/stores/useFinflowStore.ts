import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type {
  CategoryRuleDto,
  FinancialTransactionDto,
  FinflowApiPort
} from '@/contracts'
import { HttpFinflowApiAdapter } from '@/infrastructure/finflowApiAdapter'

export function formatBrlCents(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(cents / 100)
}

export const useFinflowStore = defineStore('finflow', () => {
  const transactions = ref<FinancialTransactionDto[]>([])
  const rules = ref<CategoryRuleDto[]>([])
  const byCategory = ref<Record<string, number>>({})
  const summary = ref({
    total_income_cents: 0,
    total_expense_cents: 0,
    net_balance_cents: 0,
    transactions_count: 0
  })

  const typeFilter = ref<'all' | 'income' | 'expense'>('all')
  const lastImportFeedback = ref<string>('')
  const isLoading = ref<boolean>(false)

  let apiAdapter: FinflowApiPort = new HttpFinflowApiAdapter()

  function setApiAdapter(customAdapter: FinflowApiPort) {
    apiAdapter = customAdapter
  }

  async function loadDashboard() {
    isLoading.value = true
    try {
      const data = await apiAdapter.fetchDashboard()
      summary.value = data.summary
      byCategory.value = data.by_category
      transactions.value = data.transactions
      rules.value = data.rules
    } finally {
      isLoading.value = false
    }
  }

  const filteredTransactions = computed(() => {
    if (typeFilter.value === 'all') {
      return transactions.value
    }
    return transactions.value.filter((t) => t.type === typeFilter.value)
  })

  async function submitCsvImport(csvContent: string) {
    const result = await apiAdapter.importCsv(csvContent)
    lastImportFeedback.value = `${result.imported_count} importada(s), ${result.skipped_duplicates} duplicada(s) ignorada(s)`
    await loadDashboard()
    return result
  }

  async function addTransaction(input: {
    description: string
    amount_cents: number
    type: 'income' | 'expense'
    category?: string
    occurred_on: string
  }) {
    await apiAdapter.createTransaction(input)
    await loadDashboard()
  }

  async function addRule(input: { pattern: string; category: string; priority: number }) {
    await apiAdapter.createRule(input)
    await loadDashboard()
  }

  return {
    transactions,
    rules,
    byCategory,
    summary,
    typeFilter,
    lastImportFeedback,
    isLoading,
    filteredTransactions,
    setApiAdapter,
    loadDashboard,
    submitCsvImport,
    addTransaction,
    addRule
  }
})
