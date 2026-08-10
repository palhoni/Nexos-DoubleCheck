import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: '.',
  testIgnore: ['**/_template.spec.ts'],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['./src/reporters/console.reporter.ts'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: true,
        environmentInfo: {
          APP: '__APP_NAME__',
          BASE_URL: process.env.BASE_URL || '__BASE_URL__',
        },
      },
    ],
  ],
  use: {
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    baseURL: process.env.BASE_URL || '__BASE_URL__',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'logged-in',
      testMatch: /home.*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'src/auth/.auth/state.json',
      },
    },
    {
      name: 'logged-out',
      testMatch: /login\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
