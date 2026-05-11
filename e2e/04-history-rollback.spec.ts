import { test, expect } from "./fixtures";
import { gateway } from "./gateway-client";

/**
 * Scenario: apply a bundle to create a history entry, then rollback from the
 * History page and confirm the resources are gone.
 */
test("apply creates history; rollback removes the change", async ({
  page,
  gotoGateway,
  testId,
}) => {
  const upstreamId = `${testId}-up`;
  await gotoGateway();
  await page.getByRole("link", { name: "Bundle Import" }).click();
  await page.getByRole("textbox").fill(
    `upstreams:
  ${upstreamId}:
    id: ${upstreamId}
    type: roundrobin
    scheme: http
    nodes:
      127.0.0.1:9001: 1
`,
  );
  await page.getByRole("button", { name: /^preview$/i }).click();
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page.getByText(/Applied as /)).toBeVisible();

  // Confirm backend has it
  await expect
    .poll(() =>
      gateway.get<{ value: { id?: string } }>(`/apisix/admin/upstreams/${upstreamId}`).then((r) => r.value.id),
    )
    .toBe(upstreamId);

  // Go to History and rollback the most recent entry that we just created.
  await page.getByRole("link", { name: "History" }).click();
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /^rollback$/i }).first().click();

  await expect(page.getByText(/Rolled back successfully/)).toBeVisible();

  // The upstream should be gone.
  await expect
    .poll(async () => {
      const r = await gateway.get<{ value?: { id?: string } } | undefined>(
        `/apisix/admin/upstreams/${upstreamId}`,
      );
      return r?.value?.id ?? null;
    })
    .toBeNull();
});
