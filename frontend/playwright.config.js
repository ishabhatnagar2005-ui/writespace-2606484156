/** Start a production preview for isolated browser journeys. */
import { defineConfig, devices } from '@playwright/test';

const env = process.env;
const host = env.VITE_PREVIEW_HOST || '127.0.0.1';
const port = Number(env.VITE_PREVIEW_PORT || 4173);
const baseURL = env.E2E_BASE_URL || `http://${host}:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  use: { baseURL, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js build && node node_modules/vite/bin/vite.js preview',
    env: { VITE_PREVIEW_HOST: host, VITE_PREVIEW_PORT: String(port) },
    url: baseURL,
    reuseExistingServer: !env.CI,
    timeout: 120000,
  },
});
