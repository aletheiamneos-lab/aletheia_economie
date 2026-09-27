import { defineConfig } from '@playwright/test'

const mobileProject = (name: string, width: number, height: number) => ({
  name,
  use: {
    browserName: 'chromium' as const,
    channel: 'chrome',
    viewport: { width, height },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
  },
})

export default defineConfig({
  testDir: './tests/mobile',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    locale: 'ro-RO',
    timezoneId: 'Europe/Bucharest',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    mobileProject('telefon-360', 360, 800),
    mobileProject('telefon-390', 390, 844),
    mobileProject('telefon-412', 412, 915),
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
