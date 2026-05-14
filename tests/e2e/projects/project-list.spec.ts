import { test, expect } from "@playwright/test";

test.describe("Admin can view project list", () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/projects...`);

    const response = await page.goto("/admin/projects");
    console.log(
      `[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`
    );

    await expect(page).toHaveURL(/\/admin\/projects/);
    await expect(page.getByTestId("project-page-nav")).toBeVisible();
  });

  test("Admin views the project list with seed data", async ({ page }) => {
    await expect(page.getByTestId("project-list-container")).toBeVisible();

    // Wait for async data to load
    const firstItem = page
      .locator('[data-testid^="project-item-"]')
      .first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    const count = await page
      .locator('[data-testid^="project-item-"]')
      .count();
    console.log(`[Project List] Found ${count} projects`);
    expect(count).toBeGreaterThan(0);

    // Seed project should be visible
    await expect(page.getByText("Seed Project Alpha")).toBeVisible();
  });

  test("Admin can navigate to create project page", async ({ page }) => {
    await page.getByTestId("new-project-btn").click();
    await expect(page).toHaveURL(/\/admin\/projects\/create/);
    console.log("[Project List] Navigated to create page");
  });

  test("Admin can navigate to project detail page", async ({ page }) => {
    const seedItem = page.getByTestId("project-item-seed-project-1");
    await expect(seedItem).toBeVisible({ timeout: 10000 });

    await seedItem.click();
    await expect(page).toHaveURL(/\/admin\/projects\/seed-project-1/);
    console.log("[Project List] Navigated to project detail");
  });
});
