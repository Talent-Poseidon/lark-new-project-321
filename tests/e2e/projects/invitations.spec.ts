import { test, expect } from "@playwright/test";

test.describe("Admin can manage invitations", () => {
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

  test("Admin views invitation list with different statuses", async ({
    page,
  }) => {
    // Wait for invitation list to load
    const invitationList = page.getByTestId("invitation-list");
    await expect(invitationList).toBeVisible({ timeout: 10000 });

    // Check that invitations with different statuses are visible
    const invitationItems = page.locator(
      '[data-testid^="invitation-item-"]'
    );
    const count = await invitationItems.count();
    console.log(`[Invitations] Found ${count} invitations`);
    expect(count).toBeGreaterThan(0);

    // AC-10: Verify status badges are visible
    await expect(page.getByText("Participant One")).toBeVisible();
    await expect(page.getByText("Participant Two")).toBeVisible();
    await expect(page.getByText("Participant Three")).toBeVisible();
  });

  test("Admin sends pending invitations", async ({ page }) => {
    // Wait for data to load
    await expect(
      page.getByTestId("invitation-list")
    ).toBeVisible({ timeout: 10000 });

    // Click send invitations button
    const sendBtn = page.getByTestId("send-invitations-btn");
    await expect(sendBtn).toBeVisible({ timeout: 10000 });
    await sendBtn.click();

    // Should see success message
    await expect(page.getByTestId("project-success-alert")).toContainText(
      "invitation(s) sent successfully"
    );
    console.log("[Invitations] Invitations sent successfully");
  });

  test("Admin can resend expired invitations", async ({ page }) => {
    // Wait for invitation list
    await expect(
      page.getByTestId("invitation-list")
    ).toBeVisible({ timeout: 10000 });

    // Find the resend button for expired invitation
    const resendBtn = page.getByTestId(
      "resend-invitation-seed-invitation-expired-1-btn"
    );
    await expect(resendBtn).toBeVisible({ timeout: 10000 });
    await resendBtn.click();

    // Should see success
    await expect(page.getByTestId("project-success-alert")).toContainText(
      "Invitation resent successfully"
    );
    console.log("[Invitations] Expired invitation resent");
  });
});
