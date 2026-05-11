import { test, expect } from "./fixtures";
import { gateway } from "./gateway-client";

/**
 * Scenario: create an upstream via the UI, see it in the list, then delete it.
 *
 * Upstream is the safest resource to use as a sentinel — no dependents.
 */
test("create then delete an upstream from the UI", async ({ page, gotoGateway, testId }) => {
  const upstreamId = `${testId}-up`;
  await gotoGateway();
  await page.getByRole("link", { name: "Upstreams" }).click();
  await expect(page.getByRole("heading", { name: "Upstreams" })).toBeVisible();

  // ---- create ----
  await page.getByRole("button", { name: /^new upstream$/i }).click();

  const editor = page.getByRole("textbox");
  await editor.fill(
    JSON.stringify(
      {
        id: upstreamId,
        type: "roundrobin",
        scheme: "http",
        nodes: { "127.0.0.1:9001": 1 },
      },
      null,
      2,
    ),
  );
  await page.getByRole("button", { name: /^save$/i }).click();

  // Backend should now see the resource.
  await expect
    .poll(() => gateway.get<{ value: { id?: string } }>(`/apisix/admin/upstreams/${upstreamId}`).then((r) => r?.value?.id))
    .toBe(upstreamId);

  // The list refreshes via TanStack Query invalidation — find the row.
  await expect(page.getByText(upstreamId)).toBeVisible();

  // ---- delete (confirm dialog) ----
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("row", { name: new RegExp(upstreamId) })
    .getByRole("button", { name: /^delete/ })
    .click();

  await expect
    .poll(async () => {
      const item = await gateway.get<{ value?: { id?: string } } | undefined>(
        `/apisix/admin/upstreams/${upstreamId}`,
      );
      return item?.value?.id ?? null;
    })
    .toBeNull();
});
