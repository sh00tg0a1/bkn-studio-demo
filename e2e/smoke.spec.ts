import { expect, test } from "@playwright/test";

test.describe("BKN Studio smoke", () => {
  test("home lists workspaces and can open one", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(
      page.getByRole("heading", { name: "BKN Studio", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: /e2etest/ }).click();
    await expect(page).toHaveURL(/\/workspace\/e2etest/);
  });

  test("workspace page shows shell and chat input", async ({ page }) => {
    await page.goto("/workspace/e2etest");
    await expect(
      page.getByRole("heading", { name: "e2etest", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("textbox", { name: "输入聊天消息" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "工作区侧栏" }),
    ).toBeVisible();
  });

  test("invalid workspace shows not found", async ({ page }) => {
    await page.goto("/workspace/does-not-exist-xyz");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });
});
