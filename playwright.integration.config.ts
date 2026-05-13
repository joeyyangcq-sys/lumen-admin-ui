import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env["E2E_INT_PORT"] ?? 4273);
const BASE_URL = process.env["E2E_INT_BASE_URL"] ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e/integration",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env["CI"] ? 1 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./e2e/integration/global-setup.ts",
  globalTeardown: "./e2e/integration/global-teardown.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node ./e2e/integration/write-config.mjs && pnpm build && pnpm preview --port " + PORT + " --host 127.0.0.1",
    url: BASE_URL,
    reuseExistingServer: !process.env["CI"],
    stdout: "ignore",
    stderr: "pipe",
    timeout: 120_000,
  },
});
