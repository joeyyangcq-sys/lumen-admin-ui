import { test as base } from "@playwright/test";

import { FIXTURE_PREFIX } from "./env";
import { gateway } from "./gateway-client";

interface E2EFixtures {
  /** Unique-per-test id prefix to keep fixtures isolated when parallel ever lands. */
  testId: string;
  /** The gateway feature is the only one that's enabled in E2E. */
  gotoGateway: () => Promise<void>;
}

export const test = base.extend<E2EFixtures>({
  // eslint-disable-next-line no-empty-pattern
  testId: async ({}, use, testInfo) => {
    const safe = testInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
    const id = `${FIXTURE_PREFIX}${safe}-${testInfo.workerIndex}`;
    await use(id);
    // Per-test cleanup
    await gateway.cleanupFixtures(id);
  },

  gotoGateway: async ({ page }, use) => {
    await use(async () => {
      await page.goto("/gateway");
      // dashboard shell is the first thing you see — wait until it lands
      await page.getByRole("heading", { name: /^gateway$/i }).waitFor();
    });
  },
});

export const expect = test.expect;
