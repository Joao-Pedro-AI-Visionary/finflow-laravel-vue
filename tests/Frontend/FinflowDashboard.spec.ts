import { beforeEach, describe, expect, it } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import FinflowApp from '@/FinflowApp.vue'
import { useFinflowStore } from '@/stores/useFinflowStore'
import { InMemoryFinflowApiAdapter } from '@/infrastructure/finflowApiAdapter'

describe('FinFlow Vue 3 + Laravel Fullstack UI & Store (TDD)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('loads financial telemetry summary, formats BRL currency, and filters transactions by type', async () => {
    const store = useFinflowStore()
    store.setApiAdapter(new InMemoryFinflowApiAdapter())

    const wrapper = mount(FinflowApp)
    await flushPromises()

    expect(wrapper.text()).toContain('FINFLOW // LARAVEL 12 + VUE 3.5')
    expect(wrapper.find('[data-testid="net-balance"]').text()).toContain('9.918,60')

    // Filter only expenses
    await wrapper.find('[data-testid="filter-type-expense"]').trigger('click')
    expect(wrapper.text()).toContain('AWS CLOUD SERVICES US-EAST')
    expect(wrapper.text()).not.toContain('SALARIO FULLSTACK LARAVEL VUE')
  })

  it('imports CSV batch idempotently and updates cashflow metrics reactively', async () => {
    const store = useFinflowStore()
    store.setApiAdapter(new InMemoryFinflowApiAdapter())

    const wrapper = mount(FinflowApp)
    await flushPromises()

    const csvInput = [
      'date,description,amount_cents,type',
      '2026-10-20,UBER AIRPORT TRANSFER,8500,expense'
    ].join('\n')

    await wrapper.find('[data-testid="csv-textarea"]').setValue(csvInput)
    await wrapper.find('[data-testid="csv-import-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('UBER AIRPORT TRANSFER')
    expect(wrapper.find('[data-testid="import-feedback"]').text()).toContain('1 importada(s), 0 duplicada(s)')

    // Importing the same CSV again skips duplicates
    await wrapper.find('[data-testid="csv-textarea"]').setValue(csvInput)
    await wrapper.find('[data-testid="csv-import-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="import-feedback"]').text()).toContain('0 importada(s), 1 duplicada(s)')
  })
})
