import { test, expect } from "@playwright/test";

test.describe("Kamus deletion dependency rules", () => {
  test("Kamus used by Standar Jabatan cannot be deleted (AC-8 / AC-33)", async ({
    page,
    request,
  }) => {
    // Use the API directly so the test does not depend on JS confirm() dialog
    const res = await request.delete("/api/kamus/seed-kamus-used-1");
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/tidak dapat dihapus/i);
    expect(body.dependencies.standarJabatan).toBeGreaterThan(0);
    console.log(
      `[Kamus Delete] Used kamus correctly blocked: ${JSON.stringify(body.dependencies)}`
    );

    // The item must still exist in the list view
    await page.goto("/admin/kamus");
    await expect(page.getByText("Seed Kompetensi Used By Standar")).toBeVisible({
      timeout: 10000,
    });
  });

  test("Unused Kamus can be deleted", async ({ request }) => {
    // Create a temporary kamus via API
    const code = `E2E-TMP-DEL-${Date.now()}`;

    const csv =
      "code,name,type,description,behavioralIndicators\n" +
      `${code},Tmp Delete Test,kompetensi,Tmp,Indikator A\n`;

    const upload = await request.post("/api/kamus/upload", {
      multipart: {
        file: {
          name: "tmp.csv",
          mimeType: "text/csv",
          buffer: Buffer.from(csv, "utf-8"),
        },
      },
    });
    expect(upload.ok()).toBeTruthy();

    // Look up the new id
    const listRes = await request.get(`/api/kamus?search=${code}`);
    expect(listRes.ok()).toBeTruthy();
    const list = await listRes.json();
    expect(list.length).toBeGreaterThan(0);
    const id = list[0].id;

    // Delete should succeed
    const del = await request.delete(`/api/kamus/${id}`);
    expect(del.status()).toBe(200);
    console.log(`[Kamus Delete] Unused kamus ${code} deleted`);

    // Confirm it is gone via API
    const after = await request.get(`/api/kamus?search=${code}`);
    const remaining = await after.json();
    expect(remaining.length).toBe(0);
  });
});
