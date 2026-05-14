import { test, expect } from "@playwright/test";

test.describe("Admin can create a new project", () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(
      `[Test: ${title}] Navigating to /admin/projects/create...`
    );

    const response = await page.goto("/admin/projects/create");
    console.log(
      `[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`
    );

    await expect(page).toHaveURL(/\/admin\/projects\/create/);
    await expect(
      page.getByTestId("create-project-page-nav")
    ).toBeVisible();
  });

  test("Admin views the create project form", async ({ page }) => {
    await expect(page.getByTestId("create-project-form")).toBeVisible();
    await expect(page.getByTestId("project-name-input")).toBeVisible();
    await expect(page.getByTestId("project-description-input")).toBeVisible();
    await expect(page.getByTestId("batch-name-input")).toBeVisible();
    await expect(page.getByTestId("submit-project-btn")).toBeVisible();
    console.log("[Create Project] Form elements visible");
  });

  test("Admin creates a new project and sees it in the list", async ({
    page,
  }) => {
    const uniqueName = `E2E Project ${Date.now()}`;

    await page.getByTestId("project-name-input").fill(uniqueName);
    await page.getByTestId("project-description-input").fill("Test description");
    await page.getByTestId("batch-name-input").fill("Test Batch");

    // Add a participant
    await page.getByTestId("participant-name-input").fill("Test Participant");
    await page.getByTestId("participant-email-input").fill("test@example.com");
    await page.getByTestId("add-participant-btn").click();
    await expect(page.getByTestId("participant-item-0")).toBeVisible();

    // Submit the project
    await page.getByTestId("submit-project-btn").click();

    // Should see success alert
    await expect(page.getByTestId("project-created-alert")).toContainText(
      "Project created successfully"
    );
    console.log(`[Create Project] Created: ${uniqueName}`);

    // Should redirect to project list
    await page.waitForURL(/\/admin\/projects$/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/admin\/projects$/);

    // Project should appear in the list
    await expect(page.getByTestId("project-list")).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(uniqueName)).toBeVisible();
    console.log(`[Create Project] Project "${uniqueName}" visible in list`);
  });

  test("Admin sees error when project name is empty", async ({ page }) => {
    await page.getByTestId("submit-project-btn").click();

    await expect(page.getByTestId("project-error-alert")).toContainText(
      "Project name is required"
    );
    console.log("[Create Project] Empty name error shown");
  });

  test("Admin cannot add more than 20 participants to a batch", async ({
    page,
  }) => {
    // Add 20 participants
    for (let i = 0; i < 20; i++) {
      await page
        .getByTestId("participant-name-input")
        .fill(`Participant ${i + 1}`);
      await page
        .getByTestId("participant-email-input")
        .fill(`p${i + 1}@example.com`);
      await page.getByTestId("add-participant-btn").click();
    }

    // Try to add 21st participant
    await page.getByTestId("participant-name-input").fill("Participant 21");
    await page
      .getByTestId("participant-email-input")
      .fill("p21@example.com");
    await page.getByTestId("add-participant-btn").click();

    // Should see batch size error
    await expect(page.getByTestId("project-error-alert")).toContainText(
      "batch cannot exceed 20 participants"
    );
    console.log("[Create Project] Batch size validation works");
  });
});
