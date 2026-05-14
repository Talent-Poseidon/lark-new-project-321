import { test, expect } from '@playwright/test';

test.describe('Admin can view and manage Kamus', () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/kamus...`);

    const response = await page.goto('/admin/kamus');
    console.log(`[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`);

    await expect(page).toHaveURL(/\/admin\/kamus/);
    await expect(page.getByTestId('kamus-page-nav')).toBeVisible();
  });

  test('Admin views the kamus list with seed data', async ({ page }) => {
    await expect(page.getByTestId('kamus-list-container')).toBeVisible();

    // Wait for async data to load
    const firstItem = page.locator('[data-testid^="kamus-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    const count = await page.locator('[data-testid^="kamus-item-"]').count();
    console.log(`[Kamus List] Found ${count} items`);
    expect(count).toBeGreaterThan(0);
  });

  test('Admin filters kamus by type', async ({ page }) => {
    // Wait for data to load first
    const firstItem = page.locator('[data-testid^="kamus-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    // Filter by kompetensi
    await page.getByTestId('kamus-type-filter').click();
    await page.getByRole('option', { name: 'Kompetensi' }).click();

    // Wait for filtered results
    await page.waitForTimeout(500);
    const items = page.locator('[data-testid^="kamus-item-"]');
    const count = await items.count();
    console.log(`[Kamus Filter] Found ${count} kompetensi items`);
    expect(count).toBeGreaterThan(0);
  });

  test('Admin searches kamus by name', async ({ page }) => {
    // Wait for data to load first
    const firstItem = page.locator('[data-testid^="kamus-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    // Search for a seed item
    await page.getByTestId('kamus-search-input').fill('Berpikir Analitis');

    // Wait for search results
    await page.waitForTimeout(500);
    const items = page.locator('[data-testid^="kamus-item-"]');
    const count = await items.count();
    console.log(`[Kamus Search] Found ${count} items matching "Berpikir Analitis"`);
    expect(count).toBeGreaterThan(0);
  });

  test('Admin searches kamus by code', async ({ page }) => {
    // Wait for data to load first
    const firstItem = page.locator('[data-testid^="kamus-item-"]').first();
    await expect(firstItem).toBeVisible({ timeout: 10000 });

    // Search by code
    await page.getByTestId('kamus-search-input').fill('KMP-SEED');

    // Wait for search results
    await page.waitForTimeout(500);
    const items = page.locator('[data-testid^="kamus-item-"]');
    const count = await items.count();
    console.log(`[Kamus Search] Found ${count} items matching code "KMP-SEED"`);
    expect(count).toBeGreaterThan(0);
  });

  test('Admin can navigate to upload page', async ({ page }) => {
    await page.getByTestId('kamus-upload-btn').click();
    await expect(page).toHaveURL(/\/admin\/kamus\/upload/);
    await expect(page.getByTestId('kamus-upload-page-nav')).toBeVisible();
  });
});
