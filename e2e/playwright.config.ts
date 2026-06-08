import { defineConfig, devices } from '@playwright/test';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  // Pre-bundle every dev server's deps once, so Vite optimization can't reload
  // a page mid-test under parallel load. Combined with the per-test readiness
  // gate in the spec, this keeps parallel runs stable.
  globalSetup: './global-setup.ts',
  use: {
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start all dev servers automatically before the tests. */
  webServer: [
    {
      command: 'npm --prefix ../react-form run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm --prefix ../vue-form run dev -- --port 5174',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'npm --prefix ../angular-form run dev',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
