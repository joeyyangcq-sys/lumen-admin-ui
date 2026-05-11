import { test, expect } from "./fixtures";
import { gateway } from "./gateway-client";

/**
 * Scenario: paste a bundle into Bundle Import → Preview shows a non-zero
 * create count → Apply → backend now has the resources.
 */
test("preview-then-apply a bundle creates resources on the backend", async ({
  page,
  gotoGateway,
  testId,
}) => {
  const upstreamId = `${testId}-up`;
  const serviceId = `${testId}-svc`;
  const routeId = `${testId}-rt`;

  const bundle = `routes:
  ${routeId}:
    id: ${routeId}
    uri: /e2e/${testId}
    service_id: ${serviceId}
services:
  ${serviceId}:
    id: ${serviceId}
    upstream_id: ${upstreamId}
upstreams:
  ${upstreamId}:
    id: ${upstreamId}
    type: roundrobin
    scheme: http
    nodes:
      127.0.0.1:9001: 1
`;

  await gotoGateway();
  await page.getByRole("link", { name: "Bundle Import" }).click();
  await expect(page.getByRole("heading", { name: "Bundle Import" })).toBeVisible();

  await page.getByRole("textbox").fill(bundle);
  await page.getByRole("button", { name: /^preview$/i }).click();

  // 3 creates expected (route + service + upstream)
  const createCard = page.locator("div", { hasText: /^create$/ }).first();
  await expect(createCard).toBeVisible();
  await expect(page.getByText(routeId)).toBeVisible();

  // Apply
  await page.getByRole("button", { name: /^apply$/i }).click();
  await expect(page.getByText(/Applied as /)).toBeVisible();

  // Verify against the backend
  const route = await gateway.get<{ value: { id?: string } }>(
    `/apisix/admin/routes/${routeId}`,
  );
  expect(route.value.id).toBe(routeId);
});
