import { test, expect } from '@playwright/test';

function createCSVBuffer(rows: string[][]): Buffer {
  const csv = rows.map((row) => row.join(',')).join('\n');
  return Buffer.from(csv, 'utf-8');
}

test.describe('Admin can upload and manage Kamus templates', () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/kamus/upload...`);

    const response = await page.goto('/admin/kamus/upload');
    console.log(`[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`);

    await expect(page).toHaveURL(/\/admin\/kamus\/upload/);
    await expect(page.getByTestId('kamus-upload-page-nav')).toBeVisible();
  });

  test('Admin downloads the kamus template', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('kamus-download-template-btn').click();
    const download = await downloadPromise;

    console.log(`[Template Download] File: ${download.suggestedFilename()}`);
    expect(download.suggestedFilename()).toContain('kamus-template');
  });

  test('Admin sees validation errors for invalid file', async ({ page }) => {
    const title = test.info().title;

    // Create CSV with missing fields
    const csvBuffer = createCSVBuffer([
      ['code', 'name', 'type', 'description', 'behavioralIndicators'],
      ['', 'Test Item', 'kompetensi', 'Description', 'Indicators'], // missing code
      ['TST-001', '', 'invalid_type', '', ''], // missing name, invalid type, missing desc & indicators
    ]);

    // Upload the file
    const fileInput = page.getByTestId('kamus-file-input');
    await fileInput.setInputFiles({
      name: 'test-invalid.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await page.getByTestId('kamus-upload-btn').click();

    // Wait for error response
    await expect(page.getByTestId('kamus-error-alert')).toBeVisible({ timeout: 10000 });
    console.log(`[Test: ${title}] Validation errors displayed`);

    // Check row-level errors are shown
    await expect(page.getByTestId('kamus-row-errors')).toBeVisible();
    const errorRows = page.locator('[data-testid^="kamus-error-row-"]');
    const errorCount = await errorRows.count();
    console.log(`[Test: ${title}] Found ${errorCount} row-level errors`);
    expect(errorCount).toBeGreaterThan(0);
  });

  test('Admin sees progress indicator during upload', async ({ page }) => {
    const uniqueCode = `PRG-${Date.now()}`;
    const csvBuffer = createCSVBuffer([
      ['code', 'name', 'type', 'description', 'behavioralIndicators'],
      [uniqueCode, 'Progress Test', 'kompetensi', 'Test description', 'Test indicators'],
    ]);

    const fileInput = page.getByTestId('kamus-file-input');
    await fileInput.setInputFiles({
      name: 'test-progress.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await page.getByTestId('kamus-upload-btn').click();

    // Progress indicator should appear during upload
    await expect(page.getByTestId('kamus-upload-progress')).toBeVisible({ timeout: 5000 });
    console.log('[Upload Progress] Progress indicator is visible');

    // Wait for upload to complete (success or preview)
    await expect(
      page.getByTestId('kamus-created-alert').or(page.getByTestId('kamus-preview'))
    ).toBeVisible({ timeout: 15000 });
  });

  test('Admin uploads a valid kamus template', async ({ page }) => {
    const title = test.info().title;
    const uniqueCode1 = `UPL-${Date.now()}-001`;
    const uniqueCode2 = `UPL-${Date.now()}-002`;

    const csvBuffer = createCSVBuffer([
      ['code', 'name', 'type', 'description', 'behavioralIndicators'],
      [uniqueCode1, 'Komunikasi Efektif', 'kompetensi', 'Kemampuan berkomunikasi secara efektif', 'Menyampaikan pesan dengan jelas; Mendengarkan aktif'],
      [uniqueCode2, 'Kreativitas', 'potensi', 'Kemampuan berpikir kreatif', 'Menghasilkan ide baru; Berpikir out of the box'],
    ]);

    const fileInput = page.getByTestId('kamus-file-input');
    await fileInput.setInputFiles({
      name: 'test-valid.csv',
      mimeType: 'text/csv',
      buffer: csvBuffer,
    });

    await page.getByTestId('kamus-upload-btn').click();

    // Should show success or preview (if existing data exists)
    const successAlert = page.getByTestId('kamus-created-alert');
    const previewSection = page.getByTestId('kamus-preview');

    await expect(successAlert.or(previewSection)).toBeVisible({ timeout: 15000 });

    // If preview is shown, confirm the update
    if (await previewSection.isVisible()) {
      console.log(`[Test: ${title}] Preview shown, confirming update...`);
      await page.getByTestId('kamus-confirm-update-btn').click();
      await expect(page.getByTestId('kamus-created-alert')).toBeVisible({ timeout: 10000 });
    }

    console.log(`[Test: ${title}] Kamus uploaded successfully`);
  });
});
