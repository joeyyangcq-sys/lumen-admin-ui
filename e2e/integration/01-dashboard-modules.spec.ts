import { expect, test } from "./fixtures";

test("dashboard shows gateway oauth mcp as enabled modules", async ({ page, gotoPath }) => {
  await gotoPath("/dashboard");

  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  await expect(page.getByText("Lumen Admin")).toBeVisible();

  for (const moduleName of ["Gateway", "OAuth", "MCP Server"]) {
    await expect(page.getByText(moduleName).first()).toBeVisible();
  }

  const enabledBadges = page.getByText("enabled");
  await expect(enabledBadges).toHaveCount(3);
});
