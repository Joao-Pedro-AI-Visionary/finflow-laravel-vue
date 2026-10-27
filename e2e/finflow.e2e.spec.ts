import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'

function querySqlite(sql: string): string {
  return execSync(`sqlite3 database/database.sqlite "${sql}"`, {
    encoding: 'utf-8'
  }).trim()
}

test.describe('Project 3: FinFlow Fullstack Laravel + Vue 3 Full CRUD, Constraints, SQLite & CDP E2E', () => {
  test('validates Transactions CRUD, Category Rules CRUD, Idempotent CSV, Atomic Rollback 422, Duplicate Rule 422, and SQLite Indexes', async ({
    page
  }) => {
    // Reset & seed SQLite DB cleanly
    querySqlite('DELETE FROM financial_transactions; DELETE FROM category_rules;')
    querySqlite(
      "INSERT INTO category_rules (pattern, category, priority, created_at, updated_at) VALUES ('UBER', 'Transporte', 20, datetime('now'), datetime('now'));"
    )

    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    await expect(page.locator('h1')).toContainText('Intelligent Cashflow & Idempotent CSV Rule Engine')

    // Active CDP Session
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Performance.enable')
    await cdp.send('Network.enable')

    // 1. CATEGORY RULES CRUD + UNIQUE CONSTRAINT
    // Create Rule
    await page.getByTestId('rule-pattern-input').fill('NETFLIX')
    await page.getByTestId('rule-category-input').fill('Streaming')
    await page.getByTestId('rule-submit-btn').click()
    await expect(page.getByTestId('rule-item-NETFLIX')).toBeVisible()

    // Constraint: Duplicate Rule Pattern rejected with 422
    await page.getByTestId('rule-pattern-input').fill('NETFLIX')
    await page.getByTestId('rule-category-input').fill('Duplicada')
    await page.getByTestId('rule-submit-btn').click()
    await expect(page.getByTestId('finflow-error-alert')).toContainText('Constraint 422')

    // Edit Rule
    await page.getByTestId('edit-rule-NETFLIX').click()
    await page.getByTestId('rule-category-input').fill('Lazer & Video')
    await page.getByTestId('rule-submit-btn').click()
    await expect(page.getByTestId('rule-cat-NETFLIX')).toHaveText('Lazer & Video')

    // 2. TRANSACTIONS CRUD (Quick Entry + Auto-Rule Categorization + Edit + Delete)
    await page.getByTestId('toggle-quick-entry-btn').click()

    // Constraint: Empty/zero quick entry rejected
    await page.getByTestId('quick-submit-btn').click()
    await expect(page.getByTestId('finflow-error-alert')).toContainText('Constraint 422')

    // Create Transaction via Quick Entry (matches NETFLIX -> Lazer & Video)
    await page.getByTestId('quick-desc-input').fill('NETFLIX ASSINATURA ANUAL')
    await page.getByTestId('quick-amount-input').fill('59,90')
    await page.getByTestId('quick-type-select').selectOption('expense')
    await page.getByTestId('quick-submit-btn').click()

    const createdTxId = querySqlite(
      "SELECT id FROM financial_transactions WHERE description = 'NETFLIX ASSINATURA ANUAL' LIMIT 1;"
    )
    expect(Number(createdTxId)).toBeGreaterThan(0)
    await expect(page.getByTestId(`tx-desc-${createdTxId}`)).toHaveText('NETFLIX ASSINATURA ANUAL')

    // Edit Transaction (Update via PUT)
    await page.getByTestId(`edit-tx-btn-${createdTxId}`).click()
    await page.getByTestId(`edit-tx-desc-${createdTxId}`).fill('NETFLIX ULTRA HD 4K')
    await page.getByTestId(`edit-tx-amount-${createdTxId}`).fill('6990')
    await page.getByTestId(`save-tx-${createdTxId}`).click()
    await expect(page.getByTestId(`tx-desc-${createdTxId}`)).toHaveText('NETFLIX ULTRA HD 4K')

    // 3. IDEMPOTENT CSV IMPORT & ATOMIC ROLLBACK CONSTRAINT
    const csvBatch = [
      'date,description,amount_cents,type',
      '2026-10-25,UBER AEROPORTO CONGONHAS,4500,expense',
      '2026-10-26,SALARIO PLENO LARAVEL VUE,950000,income'
    ].join('\n')

    await page.getByTestId('csv-textarea').fill(csvBatch)
    await page.getByTestId('csv-submit-btn').click()
    await expect(page.getByTestId('import-feedback')).toHaveText(
      '2 importada(s), 0 duplicada(s) ignorada(s)'
    )

    // Re-submit identical CSV -> 0 imported, 2 skipped duplicates
    await page.getByTestId('csv-submit-btn').click()
    await expect(page.getByTestId('import-feedback')).toHaveText(
      '0 importada(s), 2 duplicada(s) ignorada(s)'
    )

    // Constraint: Invalid CSV batch triggers 422 and rolls back atomically
    const invalidCsv = [
      'date,description,amount_cents,type',
      '2026-10-27,LINHA VALIDA QUE DEVE SOFRER ROLLBACK,1000,expense',
      '2026-10-27,LINHA INVALIDA ZERO CENTAVOS,0,expense'
    ].join('\n')
    await page.getByTestId('csv-textarea').fill(invalidCsv)
    await page.getByTestId('csv-submit-btn').click()
    await expect(page.getByTestId('finflow-error-alert')).toContainText('Constraint 422')

    const rolledBackCount = querySqlite(
      "SELECT COUNT(*) FROM financial_transactions WHERE description = 'LINHA VALIDA QUE DEVE SOFRER ROLLBACK';"
    )
    expect(rolledBackCount).toBe('0')

    // 4. SQLITE DB & UNIQUE INDEX VERIFICATION
    const indexList = querySqlite("PRAGMA index_list('financial_transactions');")
    expect(indexList).toContain('external_hash')

    const ruleIndexList = querySqlite("PRAGMA index_list('category_rules');")
    expect(ruleIndexList).toContain('pattern')

    // 5. SCREENSHOTS (Desktop 1440px & Mobile 390px)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.screenshot({
      path: 'test-results/p3-finflow-desktop.png',
      fullPage: true
    })

    await page.setViewportSize({ width: 390, height: 844 })
    await page.screenshot({
      path: 'test-results/p3-finflow-mobile.png',
      fullPage: true
    })

    // 6. DELETE TRANSACTION & DELETE RULE
    await page.getByTestId(`delete-tx-btn-${createdTxId}`).click()
    await expect(page.getByTestId(`tx-row-${createdTxId}`)).toHaveCount(0)

    await page.getByTestId('delete-rule-NETFLIX').click()
    await expect(page.getByTestId('rule-item-NETFLIX')).toHaveCount(0)

    // Verify 0 unexpected console errors (only the 2 intentional HTTP 422 responses)
    const unexpectedErrors = consoleErrors.filter(
      (err) => !err.includes('status of 422 (Unprocessable Content)')
    )
    expect(unexpectedErrors).toEqual([])
    expect(consoleErrors).toHaveLength(2)
  })
})
