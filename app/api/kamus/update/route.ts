import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

interface KamusRow {
  code: string;
  name: string;
  type: string;
  description: string;
  behavioralIndicators: string;
}

interface RowError {
  row: number;
  field: string;
  message: string;
}

function parseRows(rows: Record<string, unknown>[]): KamusRow[] {
  return rows.map((row) => ({
    code: String(row["code"] || row["Code"] || row["KODE"] || row["kode"] || "").trim(),
    name: String(row["name"] || row["Name"] || row["NAMA"] || row["nama"] || "").trim(),
    type: String(row["type"] || row["Type"] || row["TIPE"] || row["tipe"] || "").trim().toLowerCase(),
    description: String(row["description"] || row["Description"] || row["DESKRIPSI"] || row["deskripsi"] || "").trim(),
    behavioralIndicators: String(
      row["behavioralIndicators"] || row["Behavioral Indicators"] || row["INDIKATOR_PERILAKU"] || row["indikator_perilaku"] || row["behavioral_indicators"] || ""
    ).trim(),
  }));
}

function validateRows(items: KamusRow[]): RowError[] {
  const errors: RowError[] = [];
  const seenCodes = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = i + 2;

    if (!item.code) {
      errors.push({ row: rowNum, field: "code", message: "Kode wajib diisi" });
    }
    if (!item.name) {
      errors.push({ row: rowNum, field: "name", message: "Nama wajib diisi" });
    }
    if (!item.type) {
      errors.push({ row: rowNum, field: "type", message: "Tipe wajib diisi" });
    } else if (item.type !== "potensi" && item.type !== "kompetensi") {
      errors.push({ row: rowNum, field: "type", message: `Tipe harus 'potensi' atau 'kompetensi', ditemukan: '${item.type}'` });
    }
    if (!item.description) {
      errors.push({ row: rowNum, field: "description", message: "Deskripsi wajib diisi" });
    }
    if (!item.behavioralIndicators) {
      errors.push({ row: rowNum, field: "behavioralIndicators", message: "Indikator perilaku wajib diisi" });
    }
    if (item.code && seenCodes.has(item.code)) {
      errors.push({ row: rowNum, field: "code", message: `Kode duplikat dalam file: '${item.code}'` });
    }
    if (item.code) seenCodes.add(item.code);
  }

  return errors;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File wajib diupload" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls") && !fileName.endsWith(".csv")) {
      return NextResponse.json({ error: "Format file harus .xlsx, .xls, atau .csv" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "File tidak memiliki sheet" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    if (rows.length === 0) {
      return NextResponse.json({ error: "File tidak memiliki data" }, { status: 400 });
    }

    const uploadedItems = parseRows(rows);
    const errors = validateRows(uploadedItems);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validasi gagal", errors, validCount: uploadedItems.length - errors.length, totalRows: rows.length },
        { status: 400 }
      );
    }

    // Get existing items
    const existingItems = await prisma.kamus.findMany();
    const existingMap = new Map(existingItems.map((item) => [item.code, item]));
    const uploadedCodes = new Set(uploadedItems.map((item) => item.code));

    // Apply changes in a transaction
    await prisma.$transaction(async (tx) => {
      for (const item of uploadedItems) {
        if (!item.code) continue;
        const existing = existingMap.get(item.code);
        if (!existing) {
          // Create new
          await tx.kamus.create({
            data: {
              ...item,
              createdBy: session.user.id,
              updatedBy: session.user.id,
            },
          });
        } else {
          // Update existing
          await tx.kamus.update({
            where: { id: existing.id },
            data: {
              name: item.name,
              type: item.type,
              description: item.description,
              behavioralIndicators: item.behavioralIndicators,
              updatedBy: session.user.id,
            },
          });
        }
      }

      // Delete items not in the upload (if they exist in DB but not in file)
      const itemsToDelete = existingItems.filter((item) => !uploadedCodes.has(item.code));

      if (itemsToDelete.length > 0) {
        // Check for dependencies before deleting (AC-8)
        const idsToDelete = itemsToDelete.map((item) => item.id);

        const standarDeps = await tx.standarJabatanKompetensi.findMany({
          where: { kamusId: { in: idsToDelete } },
          select: { kamusId: true },
        });
        const scenarioDeps = await tx.scenarioKompetensi.findMany({
          where: { kamusId: { in: idsToDelete } },
          select: { kamusId: true },
        });

        const dependentIds = new Set([
          ...standarDeps.map((d) => d.kamusId),
          ...scenarioDeps.map((d) => d.kamusId),
        ]);

        const safeToDelete = idsToDelete.filter((id) => !dependentIds.has(id));

        if (safeToDelete.length > 0) {
          await tx.kamus.deleteMany({ where: { id: { in: safeToDelete } } });
        }
      }

      // Generate KamusSubmitted event
      await tx.domainEvent.create({
        data: {
          type: "KamusSubmitted",
          payload: {
            itemCount: uploadedItems.length,
            uploadedBy: session.user.id,
            isUpdate: true,
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    return NextResponse.json(
      { message: "Kamus berhasil diupdate", count: uploadedItems.length },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] POST /api/kamus/update failed:", error);
    return NextResponse.json(
      { error: "Gagal memproses update kamus" },
      { status: 500 }
    );
  }
}
