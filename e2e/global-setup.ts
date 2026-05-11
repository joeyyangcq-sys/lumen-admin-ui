import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { ADMIN_KEY, FIXTURE_PREFIX, GATEWAY_URL } from "./env";
import { gateway } from "./gateway-client";

/**
 * Runs once before any test. Two jobs:
 *   1. Sanity-check that lumen-gateway is reachable with the configured key.
 *      Fail fast with a clear message rather than letting every test time out.
 *   2. Write public/config.json so the vite preview server serves admin-ui
 *      with a runtime config pointing at the gateway under test.
 */
export default async function globalSetup(): Promise<void> {
  try {
    await gateway.ping();
  } catch (err) {
    throw new Error(
      `[e2e] Cannot reach lumen-gateway at ${GATEWAY_URL} with the supplied admin key. ` +
        `Original error: ${(err as Error).message}\n` +
        `Hint: start the gateway, then set E2E_GATEWAY_URL / E2E_ADMIN_KEY.`,
    );
  }

  // Wipe any leftovers from previous failed runs so tests start clean.
  await gateway.cleanupFixtures(FIXTURE_PREFIX);

  const configPath = resolve(__dirname, "..", "public", "config.json");
  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(
    configPath,
    JSON.stringify(
      {
        auth: { mode: "apikey", apiKey: ADMIN_KEY },
        modules: {
          gateway: { enabled: true, baseUrl: GATEWAY_URL },
          oauth: { enabled: false, baseUrl: "http://localhost:9080" },
          mcp: { enabled: false, baseUrl: "http://localhost:9280" },
          monitoring: { enabled: false, baseUrl: "http://localhost:3000" },
        },
        ui: { theme: "system", defaultLanding: "/gateway" },
      },
      null,
      2,
    ),
  );
}
