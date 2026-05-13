import { expect, test } from "./fixtures";

test("oauth discovery loads and rbac/invite actions work", async ({ page, gotoPath, testId }) => {
  await gotoPath("/oauth/discovery");

  await expect(page.getByRole("heading", { name: "Discovery & JWKS" })).toBeVisible();
  await expect(page.getByText("/.well-known/openid-configuration")).toBeVisible();
  await expect(page.getByText("JWKS keys:")).toBeVisible();

  const roleName = `${testId}-role`;
  await gotoPath("/oauth/scopes");
  await page.getByPlaceholder("role name").first().fill(roleName);
  await page.getByPlaceholder("scopes").fill("routes:read routes:write");
  await page.getByRole("button", { name: "Upsert role" }).click();

  await expect(page.getByText(roleName)).toBeVisible();

  const email = `${testId}@example.com`;
  await gotoPath("/oauth/users");
  await page.getByPlaceholder("invite email").fill(email);
  await page.getByPlaceholder("role").fill(roleName);
  await page.getByRole("button", { name: "Create invite" }).click();

  await expect(page.getByText(/invite code:/i)).toBeVisible();
});
