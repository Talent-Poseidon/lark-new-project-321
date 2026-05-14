import { test, expect } from "@playwright/test";

test.describe("Admin can assign assessors to a project", () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(
      `[Test: ${title}] Navigating to /admin/projects/seed-project-1...`
    );

    const response = await page.goto("/admin/projects/seed-project-1");
    console.log(
      `[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`
    );

    await expect(page).toHaveURL(/\/admin\/projects\/seed-project-1/);
    await expect(page.getByTestId("project-detail-nav")).toBeVisible();
  });

  test("Admin assigns an assessor to the project", async ({ page }) => {
    // Wait for page to fully load
    await expect(
      page.getByTestId("assessor-email-input")
    ).toBeVisible({ timeout: 10000 });

    // Enter assessor email (using seed user)
    await page
      .getByTestId("assessor-email-input")
      .fill("user@example.com");
    await page.getByTestId("assign-assessor-btn").click();

    // Should see success
    await expect(page.getByTestId("project-success-alert")).toContainText(
      "assessor(s) assigned successfully"
    );
    console.log("[Assessors] Assessor assigned successfully");

    // Assessor should appear in the list
    await expect(page.getByTestId("assessor-list")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("user@example.com")).toBeVisible();
  });

  test("Admin sees error for invalid assessor email", async ({ page }) => {
    await expect(
      page.getByTestId("assessor-email-input")
    ).toBeVisible({ timeout: 10000 });

    await page
      .getByTestId("assessor-email-input")
      .fill("nonexistent@example.com");
    await page.getByTestId("assign-assessor-btn").click();

    // Should see error
    await expect(page.getByTestId("project-error-alert")).toContainText(
      "Assessor not found in master data"
    );
    console.log("[Assessors] Invalid assessor error shown");
  });

  test("Admin sees AssessorAssigned event in timeline", async ({ page }) => {
    // First assign an assessor
    await expect(
      page.getByTestId("assessor-email-input")
    ).toBeVisible({ timeout: 10000 });

    await page
      .getByTestId("assessor-email-input")
      .fill("admin@example.com");
    await page.getByTestId("assign-assessor-btn").click();

    await expect(page.getByTestId("project-success-alert")).toBeVisible();

    // Check events timeline
    await expect(page.getByTestId("event-list")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("AssessorAssigned").first()).toBeVisible();
    console.log("[Assessors] AssessorAssigned event visible in timeline");
  });
});
