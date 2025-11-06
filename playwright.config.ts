import { defineConfig, devices } from '@playwright/test';

process.env.TEST_ENV = 'e2e';

export default defineConfig({
  globalSetup: './src/__tests__/e2e/e2e-setup.ts',
  testDir: './src/__tests__/e2e/tests',
  fullyParallel: true,
  workers: 1,
  retries: 0,
  reporter: [['html', { outputFolder: 'playwright-report' }]],

  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'pnpm run dev:e2e',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
