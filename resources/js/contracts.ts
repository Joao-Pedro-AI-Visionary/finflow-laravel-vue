export interface FinancialTransactionDto {
  id: number
  external_hash: string
  description: string
  amount_cents: number
  type: 'income' | 'expense'
  category: string
  matched_rule: string | null
  occurred_on: string
}

export interface CategoryRuleDto {
  id: number
  pattern: string
  category: string
  priority: number
}

export interface DashboardPayloadDto {
  summary: {
    total_income_cents: number
    total_expense_cents: number
    net_balance_cents: number
    transactions_count: number
  }
  by_category: Record<string, number>
  transactions: FinancialTransactionDto[]
  rules: CategoryRuleDto[]
}

export interface FinflowApiPort {
  fetchDashboard(): Promise<DashboardPayloadDto>
  createTransaction(input: {
    description: string
    amount_cents: number
    type: 'income' | 'expense'
    category?: string
    occurred_on: string
  }): Promise<FinancialTransactionDto>
  importCsv(csvContent: string): Promise<{
    imported_count: number
    skipped_duplicates: number
    transactions: FinancialTransactionDto[]
  }>
  createRule(input: {
    pattern: string
    category: string
    priority: number
  }): Promise<CategoryRuleDto>
}
