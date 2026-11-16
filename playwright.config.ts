import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/online.spec.ts"],
  outputDir: "output/playwright/results",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 7_000 },
  reporter: [
    ["list"],
    ["json", { outputFile: "output/playwright/report.json" }],
    ["html", { outputFolder: "output/playwright/html", open: "never" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:4173",
    locale: "vi-VN",
    timezoneId: "Asia/Bangkok",
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: {
      ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
        ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
        : {}),
    },
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    timeout: 15_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
  },
});
