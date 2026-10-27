import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:8002',
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 900 },
    launchOptions: {
      slowMo: 150
    }
  },
  webServer: {
    command: '/opt/homebrew/bin/php artisan serve --host=127.0.0.1 --port=8002',
    url: 'http://127.0.0.1:8002',
    reuseExistingServer: false,
    timeout: 15000
  }
})
