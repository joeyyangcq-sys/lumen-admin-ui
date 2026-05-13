import { expect, test } from "./fixtures";

test("mcp tools list and playground response are reachable", async ({ page, gotoPath }) => {
  await gotoPath("/mcp/tools");

  await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();
  await expect(page.getByText("list_routes")).toBeVisible();

  await gotoPath("/mcp/playground");
  await expect(page.getByRole("heading", { name: "Playground" })).toBeVisible();

  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.locator("pre")).not.toContainText("(no response yet)");
});
