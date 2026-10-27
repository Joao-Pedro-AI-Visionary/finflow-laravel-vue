import type {
  CategoryRuleDto,
  DashboardPayloadDto,
  FinancialTransactionDto,
  FinflowApiPort
} from '@/contracts'

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json = (await res.json()) as {
      message?: string
      errors?: Record<string, string[]>
    }
    const firstFieldErrors = json.errors ? Object.values(json.errors)[0] : undefined
    if (firstFieldErrors?.[0]) {
      return `Constraint ${res.status}: ${firstFieldErrors[0]}`
    }
    if (json.message) {
      return `Constraint ${res.status}: ${json.message}`
    }
  } catch {
    // ignore parse error
  }
  return fallback
}

export class HttpFinflowApiAdapter implements FinflowApiPort {
  async fetchDashboard(): Promise<DashboardPayloadDto> {
    const res = await fetch('/api/v1/dashboard', {
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Falha ao carregar o dashboard financeiro.'))
    const json = (await res.json()) as { data: DashboardPayloadDto }
    return json.data
  }

  async createTransaction(input: {
    description: string
    amount_cents: number
    type: 'income' | 'expense'
    category?: string
    occurred_on: string
  }): Promise<FinancialTransactionDto> {
    const res = await fetch('/api/v1/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Falha ao registrar transação.'))
    const json = (await res.json()) as { data: FinancialTransactionDto }
    return json.data
  }

  async updateTransaction(
    id: number,
    input: {
      description?: string
      amount_cents?: number
      type?: 'income' | 'expense'
      category?: string
    }
  ): Promise<FinancialTransactionDto> {
    const res = await fetch(`/api/v1/transactions/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Falha ao atualizar transação.'))
    const json = (await res.json()) as { data: FinancialTransactionDto }
    return json.data
  }

  async deleteTransaction(id: number): Promise<void> {
    const res = await fetch(`/api/v1/transactions/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Falha ao excluir transação.'))
  }

  async importCsv(csvContent: string): Promise<{
    imported_count: number
    skipped_duplicates: number
    transactions: FinancialTransactionDto[]
  }> {
    const res = await fetch('/api/v1/transactions/import-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ csv_content: csvContent })
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Falha ao importar extrato CSV.'))
    const json = (await res.json()) as {
      data: {
        imported_count: number
        skipped_duplicates: number
        transactions: FinancialTransactionDto[]
      }
    }
    return json.data
  }

  async createRule(input: {
    pattern: string
    category: string
    priority: number
  }): Promise<CategoryRuleDto> {
    const res = await fetch('/api/v1/rules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Falha ao criar regra de categorização.'))
    const json = (await res.json()) as { data: CategoryRuleDto }
    return json.data
  }

  async updateRule(
    id: number,
    input: {
      pattern?: string
      category?: string
      priority?: number
    }
  ): Promise<CategoryRuleDto> {
    const res = await fetch(`/api/v1/rules/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(input)
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Falha ao atualizar regra de categorização.'))
    const json = (await res.json()) as { data: CategoryRuleDto }
    return json.data
  }

  async deleteRule(id: number): Promise<void> {
    const res = await fetch(`/api/v1/rules/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' }
    })
    if (!res.ok) throw new Error(await extractErrorMessage(res, 'Falha ao excluir regra de categorização.'))
  }
}

export class InMemoryFinflowApiAdapter implements FinflowApiPort {
  private rules: CategoryRuleDto[] = [
    { id: 1, pattern: 'UBER', category: 'Transporte', priority: 20 },
    { id: 2, pattern: 'IFOOD', category: 'Alimentação', priority: 25 },
    { id: 3, pattern: 'AWS', category: 'Infraestrutura Cloud', priority: 30 },
    { id: 4, pattern: 'GITHUB', category: 'Ferramentas Dev', priority: 30 },
    { id: 5, pattern: 'SALARIO', category: 'Salário & Contratos', priority: 50 }
  ]

  private transactions: FinancialTransactionDto[] = [
    {
      id: 1,
      external_hash: 'h-1',
      description: 'SALARIO FULLSTACK LARAVEL VUE',
      amount_cents: 1050000,
      type: 'income',
      category: 'Salário & Contratos',
      matched_rule: 'SALARIO',
      occurred_on: '2026-10-05'
    },
    {
      id: 2,
      external_hash: 'h-2',
      description: 'AWS CLOUD SERVICES US-EAST',
      amount_cents: 34500,
      type: 'expense',
      category: 'Infraestrutura Cloud',
      matched_rule: 'AWS',
      occurred_on: '2026-10-08'
    },
    {
      id: 3,
      external_hash: 'h-3',
      description: 'UBER TRIP CENTRO TECNOLOGICO',
      amount_cents: 4290,
      type: 'expense',
      category: 'Transporte',
      matched_rule: 'UBER',
      occurred_on: '2026-10-11'
    },
    {
      id: 4,
      external_hash: 'h-4',
      description: 'IFOOD RESTAURANTE EXECUTIVO',
      amount_cents: 7850,
      type: 'expense',
      category: 'Alimentação',
      matched_rule: 'IFOOD',
      occurred_on: '2026-10-14'
    },
    {
      id: 5,
      external_hash: 'h-5',
      description: 'GITHUB COPILOT & ACTIONS',
      amount_cents: 11500,
      type: 'expense',
      category: 'Ferramentas Dev',
      matched_rule: 'GITHUB',
      occurred_on: '2026-10-18'
    }
  ]

  private classify(description: string, type: 'income' | 'expense') {
    const upper = description.toUpperCase()
    const sorted = [...this.rules].sort((a, b) => b.priority - a.priority)
    for (const rule of sorted) {
      if (upper.includes(rule.pattern.toUpperCase())) {
        return { category: rule.category, matched_rule: rule.pattern }
      }
    }
    return {
      category: type === 'income' ? 'Receitas Gerais' : 'Outros',
      matched_rule: null
    }
  }

  async fetchDashboard(): Promise<DashboardPayloadDto> {
    const totalIncome = this.transactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount_cents, 0)
    const totalExpense = this.transactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount_cents, 0)

    const byCategory: Record<string, number> = {}
    for (const tx of this.transactions.filter((t) => t.type === 'expense')) {
      byCategory[tx.category] = (byCategory[tx.category] ?? 0) + tx.amount_cents
    }

    return {
      summary: {
        total_income_cents: totalIncome,
        total_expense_cents: totalExpense,
        net_balance_cents: totalIncome - totalExpense,
        transactions_count: this.transactions.length
      },
      by_category: byCategory,
      transactions: [...this.transactions],
      rules: [...this.rules]
    }
  }

  async createTransaction(input: {
    description: string
    amount_cents: number
    type: 'income' | 'expense'
    category?: string
    occurred_on: string
  }): Promise<FinancialTransactionDto> {
    const match = input.category
      ? { category: input.category, matched_rule: null }
      : this.classify(input.description, input.type)

    const created: FinancialTransactionDto = {
      id: Date.now(),
      external_hash: `hash-${Date.now()}`,
      description: input.description,
      amount_cents: input.amount_cents,
      type: input.type,
      category: match.category,
      matched_rule: match.matched_rule,
      occurred_on: input.occurred_on
    }
    this.transactions.unshift(created)
    return created
  }

  async updateTransaction(
    id: number,
    input: {
      description?: string
      amount_cents?: number
      type?: 'income' | 'expense'
      category?: string
    }
  ): Promise<FinancialTransactionDto> {
    const idx = this.transactions.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Transação não encontrada.')
    const updated: FinancialTransactionDto = {
      ...this.transactions[idx],
      ...input
    }
    this.transactions[idx] = updated
    return updated
  }

  async deleteTransaction(id: number): Promise<void> {
    this.transactions = this.transactions.filter((t) => t.id !== id)
  }

  async importCsv(csvContent: string) {
    const lines = csvContent.trim().split(/\r?\n/).slice(1)
    const imported: FinancialTransactionDto[] = []
    let skipped = 0

    for (const line of lines) {
      if (!line.trim()) continue
      const [occurred_on, description, amountRaw, typeRaw] = line.split(',').map((s) => s.trim())
      const type = typeRaw === 'income' ? 'income' : 'expense'
      const amount_cents = Number(amountRaw)
      if (!occurred_on || !description || !Number.isFinite(amount_cents) || amount_cents < 1) {
        throw new Error('Constraint 422: Linha CSV inválida.')
      }
      const hashKey = `${occurred_on}|${description.toLowerCase()}|${amount_cents}|${type}`

      if (this.transactions.some((t) => t.external_hash === hashKey)) {
        skipped++
        continue
      }

      const match = this.classify(description, type)
      const created: FinancialTransactionDto = {
        id: Date.now() + imported.length,
        external_hash: hashKey,
        description,
        amount_cents,
        type,
        category: match.category,
        matched_rule: match.matched_rule,
        occurred_on
      }
      this.transactions.unshift(created)
      imported.push(created)
    }

    return {
      imported_count: imported.length,
      skipped_duplicates: skipped,
      transactions: imported
    }
  }

  async createRule(input: {
    pattern: string
    category: string
    priority: number
  }): Promise<CategoryRuleDto> {
    const upper = input.pattern.toUpperCase()
    if (this.rules.some((r) => r.pattern.toUpperCase() === upper)) {
      throw new Error('Constraint 422: Padrão de regra já cadastrado.')
    }
    const created: CategoryRuleDto = {
      id: Date.now(),
      pattern: upper,
      category: input.category,
      priority: input.priority
    }
    this.rules.unshift(created)
    return created
  }

  async updateRule(
    id: number,
    input: {
      pattern?: string
      category?: string
      priority?: number
    }
  ): Promise<CategoryRuleDto> {
    const idx = this.rules.findIndex((r) => r.id === id)
    if (idx === -1) throw new Error('Regra não encontrada.')
    const updated: CategoryRuleDto = {
      ...this.rules[idx],
      ...input,
      pattern: (input.pattern ?? this.rules[idx].pattern).toUpperCase()
    }
    this.rules[idx] = updated
    return updated
  }

  async deleteRule(id: number): Promise<void> {
    this.rules = this.rules.filter((r) => r.id !== id)
  }
}
