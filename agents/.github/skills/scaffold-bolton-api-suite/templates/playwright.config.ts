import type { PlaywrightTestConfig } from '@playwright/test';
import { environment } from './src/api/config/environment';

const config: PlaywrightTestConfig = {
  testDir: 'tests',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['./src/reporters/console.reporter.ts'], ['html', { open: 'never' }], ['allure-playwright']],
  use: {
    baseURL: environment.apiBaseUrl,
    trace: 'on-first-retry',
  },
};

export default config;
