import { test, expect } from "@playwright/test";

test.describe("Admin views Kamus Potensi & Kompetensi", () => {
  test.beforeEach(async ({ page }) => {
    const title = test.info().title;
    console.log(`[Test: ${title}] Navigating to /admin/kamus...`);

    const response = await page.goto("/admin/kamus");
    console.log(
      `[Test: ${title}] Status: ${response?.status()} | URL: ${page.url()}`
    );

    await expect(page).toHaveURL(/\/admin\/kamus(\?|$)/);
    await expect(page.getByTestId("kamus-page-nav")).toBeVisible();
  });

  test("Admin sees the list of submitted Kamus items (AC-6)", async ({ page }) => {
    await expect(page.getByTestId("kamus-list-container")).toBeVisible();

    const first = page.locator('[data-testid^="kamus-item-"]').first();
    await expect(first).toBeVisible({ timeout: 10000 });

    const count = await page.locator('[data-testid^="kamus-item-"]').count();
    console.log(`[Kamus List] Items: ${count}`);
    expect(count).toBeGreaterThan(0);

    // Seeded items
    await expect(
      page.getByText("Seed Kompetensi Berpikir Analitis")
    ).toBeVisible();
    await expect(page.getByText("Seed Potensi Daya Tahan Stres")).toBeVisible();
  });

  test("Admin filters Kamus by type (AC-6)", async ({ page }) => {
    await expect(page.getByTestId("kamus-list")).toBeVisible({ timeout: 10000 });

    await page.getByTestId("kamus-type-filter").click();
    await page.getByTestId("kamus-type-filter-potensi").click();

    // Wait briefly for refetch
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Seed Potensi Daya Tahan Stres")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("Seed Kompetensi Berpikir Analitis")
    ).toHaveCount(0);
    console.log("[Kamus List] Filter by 'potensi' works");
  });

  test("Admin searches Kamus by name (AC-6)", async ({ page }) => {
    await page.getByTestId("kamus-search-input").fill("Berpikir Analitis");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByText("Seed Kompetensi Berpikir Analitis")
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Seed Potensi Daya Tahan Stres")).toHaveCount(
      0
    );
    console.log("[Kamus List] Search by name works");
  });

  test("Admin searches Kamus by code (AC-6)", async ({ page }) => {
    await page.getByTestId("kamus-search-input").fill("SEED-POT");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("SEED-POT-001")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("SEED-KMP-001")).toHaveCount(0);
    console.log("[Kamus List] Search by code works");
  });
});
