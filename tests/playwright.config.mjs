import { defineConfig, devices } from '@playwright/test';

const port = 4173;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: '../test-results',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never', outputFolder: '../playwright-report' }]]
    : [['list']],
  use: { baseURL, trace: 'retain-on-failure' },
  // The site is served with the exact headers from vercel.json (see tests/serve.mjs)
  webServer: {
    command: `node serve.mjs ${port}`,
    cwd: '.',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', testIgnore: /visual/, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testIgnore: /visual/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testIgnore: /visual/, use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', testIgnore: /visual/, use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', testIgnore: /visual/, use: { ...devices['iPhone 14'] } },
    // Pixel baselines depend on the OS font stack: run locally with `npm run test:visual`, not in CI.
    { name: 'visual', testMatch: /visual/, use: { ...devices['Desktop Chrome'] } },
  ],
});
