import { test, expect } from '@playwright/test';

test.describe('Admin can manage Scenario Assessment', () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/scenario...`);

    const response = await page.goto('/admin/scenario');
    console.log(`[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`);

    await expect(page).toHaveURL(/\/admin\/scenario/);
    await expect(page.getByTestId('scenario-page-nav')).toBeVisible();
  });

  test('Admin views the scenario list with seed data', async ({ page }) => {
    await expect(page.getByTestId('scenario-list-container')).toBeVisible();

    // Wait for async data to load
    const firstItem = page.locator('[data-testid^="scenario-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    const count = await page.locator('[data-testid^="scenario-item-"]').count();
    console.log(`[Scenario List] Found ${count} items`);
    expect(count).toBeGreaterThan(0);
  });

  test('Admin searches scenario by name', async ({ page }) => {
    // Wait for data to load first
    const firstItem = page.locator('[data-testid^="scenario-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    // Search for a seed item
    await page.getByTestId('scenario-search-input').fill('Simulasi Presentasi');

    // Wait for search results
    await page.waitForTimeout(500);
    const items = page.locator('[data-testid^="scenario-item-"]');
    const count = await items.count();
    console.log(`[Scenario Search] Found ${count} items matching "Simulasi Presentasi"`);
    expect(count).toBeGreaterThan(0);
  });

  test('Admin filters scenario by type', async ({ page }) => {
    // Wait for data to load first
    const firstItem = page.locator('[data-testid^="scenario-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    // Filter by simulasi
    await page.getByTestId('scenario-type-filter').click();
    await page.getByRole('option', { name: 'Simulasi' }).click();

    // Wait for filtered results
    await page.waitForTimeout(500);
    const items = page.locator('[data-testid^="scenario-item-"]');
    const count = await items.count();
    console.log(`[Scenario Filter] Found ${count} simulasi items`);
    expect(count).toBeGreaterThan(0);
  });

  test('Admin creates a new scenario', async ({ page }) => {
    const title = test.info().title;
    const uniqueName = `E2E Scenario ${Date.now()}`;

    // Open dialog
    await page.getByTestId('new-scenario-btn').click();

    // Fill form
    await page.getByTestId('scenario-name-input').fill(uniqueName);

    // Select type
    await page.getByTestId('scenario-type-input').click();
    await page.getByRole('option', { name: 'Role Play' }).click();

    await page.getByTestId('scenario-duration-input').fill('45');
    await page.getByTestId('scenario-description-input').fill('Scenario E2E testing');
    await page.getByTestId('scenario-instructions-input').fill('Instruksi untuk testing E2E');

    // Add at least 1 kompetensi from kamus
    const addKamusBtn = page.locator('[data-testid^="scenario-add-kamus-"]').first();
    await expect(addKamusBtn).toBeVisible({ timeout: 10000 });
    await addKamusBtn.click();

    // Verify kompetensi added
    await expect(page.getByTestId('scenario-kompetensi-list')).toBeVisible();

    // Submit
    await page.getByTestId('submit-scenario-btn').click();

    // Wait for success
    await expect(page.getByTestId('scenario-created-alert')).toBeVisible({ timeout: 10000 });
    console.log(`[Test: ${title}] Scenario created: ${uniqueName}`);
  });

  test('Admin sees validation error when creating without kompetensi', async ({ page }) => {
    const title = test.info().title;

    // Open dialog
    await page.getByTestId('new-scenario-btn').click();

    // Fill form without adding kompetensi
    await page.getByTestId('scenario-name-input').fill('Test Without Kompetensi');
    await page.getByTestId('scenario-type-input').click();
    await page.getByRole('option', { name: 'Wawancara' }).click();
    await page.getByTestId('scenario-duration-input').fill('30');
    await page.getByTestId('scenario-description-input').fill('Test');
    await page.getByTestId('scenario-instructions-input').fill('Test');

    // Submit button should be disabled without kompetensi
    const submitBtn = page.getByTestId('submit-scenario-btn');
    await expect(submitBtn).toBeDisabled();
    console.log(`[Test: ${title}] Submit button correctly disabled without kompetensi`);
  });
});
