import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
const systemBrowser = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
    launchOptions: existsSync(systemBrowser) ? { executablePath: systemBrowser } : {},
  },
  webServer: {
    command: 'npm run build && npm start',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
