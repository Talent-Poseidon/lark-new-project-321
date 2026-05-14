import { test, expect } from '@playwright/test';

test.describe('Admin can manage Standar Jabatan', () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/standar-jabatan...`);

    const response = await page.goto('/admin/standar-jabatan');
    console.log(`[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`);

    await expect(page).toHaveURL(/\/admin\/standar-jabatan/);
    await expect(page.getByTestId('standar-page-nav')).toBeVisible();
  });

  test('Admin views the standar jabatan list with seed data', async ({ page }) => {
    await expect(page.getByTestId('standar-list-container')).toBeVisible();

    // Wait for async data to load
    const firstItem = page.locator('[data-testid^="standar-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    const count = await page.locator('[data-testid^="standar-item-"]').count();
    console.log(`[Standar List] Found ${count} items`);
    expect(count).toBeGreaterThan(0);
  });

  test('Admin searches standar jabatan by name', async ({ page }) => {
    // Wait for data to load first
    const firstItem = page.locator('[data-testid^="standar-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    // Search for a seed item
    await page.getByTestId('standar-search-input').fill('Manager IT');

    // Wait for search results
    await page.waitForTimeout(500);
    const items = page.locator('[data-testid^="standar-item-"]');
    const count = await items.count();
    console.log(`[Standar Search] Found ${count} items matching "Manager IT"`);
    expect(count).toBeGreaterThan(0);
  });

  test('Admin creates a new standar jabatan', async ({ page }) => {
    const title = test.info().title;
    const uniqueName = `E2E Standar ${Date.now()}`;

    // Open dialog
    await page.getByTestId('new-standar-btn').click();

    // Fill form
    await page.getByTestId('standar-name-input').fill(uniqueName);
    await page.getByTestId('standar-level-input').fill('Manager');
    await page.getByTestId('standar-description-input').fill('Standar jabatan untuk testing E2E');

    // Add at least 1 kompetensi from kamus
    const addKamusBtn = page.locator('[data-testid^="standar-add-kamus-"]').first();
    await expect(addKamusBtn).toBeVisible({ timeout: 10000 });
    await addKamusBtn.click();

    // Verify kompetensi added
    await expect(page.getByTestId('standar-kompetensi-list')).toBeVisible();

    // Submit
    await page.getByTestId('submit-standar-btn').click();

    // Wait for success
    await expect(page.getByTestId('standar-created-alert')).toBeVisible({ timeout: 10000 });
    console.log(`[Test: ${title}] Standar jabatan created: ${uniqueName}`);
  });

  test('Admin sees validation error when creating without kompetensi', async ({ page }) => {
    const title = test.info().title;

    // Open dialog
    await page.getByTestId('new-standar-btn').click();

    // Fill form without adding kompetensi
    await page.getByTestId('standar-name-input').fill('Test Without Kompetensi');
    await page.getByTestId('standar-level-input').fill('Junior');
    await page.getByTestId('standar-description-input').fill('Test');

    // Submit button should be disabled without kompetensi
    const submitBtn = page.getByTestId('submit-standar-btn');
    await expect(submitBtn).toBeDisabled();
    console.log(`[Test: ${title}] Submit button correctly disabled without kompetensi`);
  });
});
