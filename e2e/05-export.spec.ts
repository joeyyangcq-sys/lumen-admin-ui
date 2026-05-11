import { test, expect } from "./fixtures";
import { gateway } from "./gateway-client";

/**
 * Scenario: seed a route via direct API, then export from the Export page
 * with format=yaml and verify the textarea contains the seeded id.
 */
test("export generates a YAML bundle that contains the seeded resource", async ({
  page,
  gotoGateway,
  testId,
}) => {
  const upstreamId = `${testId}-export-up`;
  // seed via direct API — UI has no "create upstream" hot-path on Export
  await gateway.put(`/apisix/admin/upstreams/${upstreamId}`, {
    id: upstreamId,
    type: "roundrobin",
    scheme: "http",
    nodes: { "127.0.0.1:9001": 1 },
  });

  await gotoGateway();
  await page.getByRole("link", { name: "Export" }).click();
  await expect(page.getByRole("heading", { name: "Export" })).toBeVisible();

  // Switch format to yaml
  await page.getByRole("button", { name: /^yaml$/i }).click();
  await page.getByRole("button", { name: /^generate$/i }).click();

  const output = page.getByRole("textbox", { name: /bundle output|^$/ }).first();
  await expect(output).not.toBeEmpty();
  await expect(output).toContainText(upstreamId);
});
