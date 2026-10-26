import { defineConfig, devices } from '@playwright/test';
import { APP_PORT } from './tests/e2e/env.mjs';

// SMOKE_URL runs only the @smoke tests against a deployed site (a Vercel
// preview or production) instead of starting the app locally.
const smokeUrl = process.env.SMOKE_URL;
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

const desktop = { viewport: { width: 1280, height: 900 } };

export default defineConfig({
  testDir: 'tests/e2e',
  // All tests share one database, so they run one at a time.
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  grep: smokeUrl ? /@smoke/ : undefined,
  use: {
    baseURL: smokeUrl || `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: bypass
      ? { 'x-vercel-protection-bypass': bypass, 'x-vercel-set-bypass-cookie': 'true' }
      : undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...desktop,
        // A fake microphone, so the voice recorder can be tested.
        launchOptions: { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] },
      },
      testIgnore: /phone\.spec/,
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], ...desktop }, testIgnore: /phone\.spec/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'], ...desktop }, testIgnore: /phone\.spec/ },
    { name: 'phone', use: { ...devices['iPhone 13'] }, testMatch: /(phone|signed-out)\.spec/ },
  ],
  webServer: smokeUrl
    ? undefined
    : {
        command: 'node tests/e2e/server.mjs',
        url: `http://localhost:${APP_PORT}`,
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
