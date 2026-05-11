import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env["E2E_PORT"] ?? 4173);
const BASE_URL = process.env["E2E_BASE_URL"] ?? `http://127.0.0.1:${PORT}`;
const GATEWAY_URL = process.env["E2E_GATEWAY_URL"] ?? "http://127.0.0.1:18080";

/**
 * Playwright config — exercises admin-ui against a real lumen-gateway.
 *
 * Prerequisites:
 *   1. lumen-gateway running on $E2E_GATEWAY_URL with X-API-KEY = $E2E_ADMIN_KEY
 *   2. etcd reachable from the gateway
 *
 * The webServer entry below builds and serves admin-ui via vite preview.
 * We rely on the test setup (e2e/global-setup.ts) to write a public/config.json
 * that points at the gateway, so dist/ + the runtime config compose correctly.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env["CI"] ? 2 : 0,
  reporter: process.env["CI"] ? [["github"], ["html", { open: "never" }]] : [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
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
    command: "pnpm build && pnpm preview --port " + PORT + " --host 127.0.0.1",
    url: BASE_URL,
    reuseExistingServer: !process.env["CI"],
    stdout: "ignore",
    stderr: "pipe",
    env: {
      E2E_GATEWAY_URL: GATEWAY_URL,
    },
    timeout: 120_000,
  },
});
