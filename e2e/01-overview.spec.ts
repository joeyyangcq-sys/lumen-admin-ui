import { test, expect } from "./fixtures";

/**
 * Smoke: admin-ui boots, talks to lumen-gateway with the configured key,
 * and the Overview page renders live data (totals + control-plane capabilities).
 */
test("gateway overview loads counts + capabilities from a live backend", async ({
  page,
  gotoGateway,
}) => {
  await gotoGateway();

  // Five resource stat tiles render labels (and either "…" while loading or a number).
  for (const label of ["Routes", "Services", "Upstreams", "Plugin Configs", "Global Rules"]) {
    await expect(page.getByText(label)).toBeVisible();
  }

  // Capabilities card pulls /control/schema and shows export formats.
  await expect(page.getByText(/bundle formats:\s*(json|yaml)/i)).toBeVisible();

  // No banner-level errors should be visible.
  await expect(page.getByText(/queries failed/i)).toHaveCount(0);
});
