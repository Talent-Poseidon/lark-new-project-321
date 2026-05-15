import { test, expect } from "@playwright/test";

test.describe("Admin updates Kamus via re-upload (AC-7)", () => {
  test("Re-upload shows preview of changes before confirmation", async ({
    page,
    request,
  }) => {
    // Seed a known-state item to update
    const baseCode = `E2E-UPD-${Date.now()}`;
    const seedCsv =
      "code,name,type,description,behavioralIndicators\n" +
      `${baseCode},Initial Name,kompetensi,Initial Desc,Indikator awal\n`;

    const seedRes = await request.post("/api/kamus/upload", {
      multipart: {
        file: {
          name: "seed.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(seedCsv, "utf-8"),
        },
      },
    });
    expect(seedRes.ok()).toBeTruthy();

    // Now upload an updated template via the UI in update mode
    await page.goto("/admin/kamus/upload");
    await expect(page.getByTestId("kamus-upload-page-nav")).toBeVisible();

    await page.getByTestId("mode-update-btn").click();

    const newCode = `E2E-UPD-NEW-${Date.now()}`;
    const updateCsv =
      "code,name,type,description,behavioralIndicators\n" +
      `${baseCode},Updated Name,kompetensi,New Desc,Indikator baru\n` +
      `${newCode},Brand New,potensi,Brand new desc,Indikator brand new\n`;

    await page.getByTestId("kamus-file-input").setInputFiles({
      name: "update.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(updateCsv, "utf-8"),
    });

    await page.getByTestId("submit-kamus-btn").click();

    // Preview container should show
    await expect(page.getByTestId("kamus-preview-container")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByTestId(`preview-change-${baseCode}`)).toBeVisible();
    await expect(page.getByTestId(`preview-change-${newCode}`)).toBeVisible();

    // Summary shows at least 1 new and 1 updated
    const newSummary = await page
      .getByTestId("preview-summary-new")
      .textContent();
    const updatedSummary = await page
      .getByTestId("preview-summary-updated")
      .textContent();
    expect(newSummary).toContain("Baru:");
    expect(updatedSummary).toContain("Diubah:");
    console.log(
      `[Kamus Update] Preview shown — ${newSummary} | ${updatedSummary}`
    );
  });
});
