import { test as base } from "@playwright/test";

import { FIXTURE_PREFIX } from "./env";

interface E2EIntegrationFixtures {
  testId: string;
  gotoPath: (path: string) => Promise<void>;
}

export const test = base.extend<E2EIntegrationFixtures>({
  // eslint-disable-next-line no-empty-pattern
  testId: async ({}, use, testInfo) => {
    const safe = testInfo.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24);
    await use(`${FIXTURE_PREFIX}${safe}-${testInfo.workerIndex}`);
  },

  gotoPath: async ({ page }, use) => {
    await use(async (path: string) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
    });
  },
});

export const expect = test.expect;
