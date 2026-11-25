import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  webServer: process.env.MTDM_BASE_URL ? undefined : {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173/MTDM-AI-Lab/",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  },
  use: {
    baseURL: process.env.MTDM_BASE_URL || "http://127.0.0.1:4173/MTDM-AI-Lab/",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"]
  }
});
