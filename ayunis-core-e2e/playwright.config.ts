import { defineConfig, devices } from '@playwright/test';
import { config } from './src/config';

const setupDependencies = process.env.CI ? [] : ['setup'];

// Tests run against an already-running ./dev stack in e2e mode:
//   ./dev up --slot 2 --e2e && (cd ayunis-core-backend && pnpm seed)
// Slot 2 → frontend on 3021. Override with E2E_BASE_URL for other slots.
// Auth and org setup happen per worker via src/fixtures/test.ts + src/factories/.
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Local runs share one machine with the dev stack (ts-node backend, Vite,
  // Docker). More workers = CPU contention = 30s-timeout cascades: every
  // worker creates its org at t=0 (bcrypt + MJML email rendering are
  // CPU-heavy) while Chromium records traces for all of them.
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['list'], ['json', { outputFile: 'test-results/results.json' }]]
    : [['list'], ['json', { outputFile: 'test-results/results.json' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: config.baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Video recording costs real CPU per worker and multiplies the
    // contention above — keep it for retry artifacts only.
    video: process.env.CI ? 'on-first-retry' : 'off',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /tests\/setup\/.*\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testIgnore: [/tests\/setup\//, /tests\/screenshots\//],
      dependencies: setupDependencies,
      use: { ...devices['Desktop Chrome'] },
    },
    // PR-review screenshots — run explicitly: playwright test --project=screenshots
    // (package scripts pin --project=chromium so this never runs by accident).
    {
      name: 'screenshots',
      testMatch: /tests\/screenshots\/.*\.shots\.ts/,
      dependencies: setupDependencies,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
