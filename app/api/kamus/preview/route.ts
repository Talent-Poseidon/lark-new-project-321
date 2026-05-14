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

interface ChangeItem {
  code: string;
  status: "new" | "updated" | "deleted";
  changes?: Record<string, { old: string; new: string }>;
  data: KamusRow;
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

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ error: "File tidak memiliki sheet" }, { status: 400 });
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    // Parse uploaded rows
    const uploadedItems: KamusRow[] = rows.map((row) => ({
      code: String(row["code"] || row["Code"] || row["KODE"] || row["kode"] || "").trim(),
      name: String(row["name"] || row["Name"] || row["NAMA"] || row["nama"] || "").trim(),
      type: String(row["type"] || row["Type"] || row["TIPE"] || row["tipe"] || "").trim().toLowerCase(),
      description: String(row["description"] || row["Description"] || row["DESKRIPSI"] || row["deskripsi"] || "").trim(),
      behavioralIndicators: String(
        row["behavioralIndicators"] || row["Behavioral Indicators"] || row["INDIKATOR_PERILAKU"] || row["indikator_perilaku"] || row["behavioral_indicators"] || ""
      ).trim(),
    }));

    // Get existing kamus items
    const existingItems = await prisma.kamus.findMany();
    const existingMap = new Map(existingItems.map((item) => [item.code, item]));
    const uploadedCodes = new Set(uploadedItems.map((item) => item.code));

    const changes: ChangeItem[] = [];

    // Detect new and updated items
    for (const item of uploadedItems) {
      if (!item.code) continue;
      const existing = existingMap.get(item.code);
      if (!existing) {
        changes.push({ code: item.code, status: "new", data: item });
      } else {
        const fieldChanges: Record<string, { old: string; new: string }> = {};
        if (existing.name !== item.name) fieldChanges.name = { old: existing.name, new: item.name };
        if (existing.type !== item.type) fieldChanges.type = { old: existing.type, new: item.type };
        if (existing.description !== item.description) fieldChanges.description = { old: existing.description, new: item.description };
        if (existing.behavioralIndicators !== item.behavioralIndicators) fieldChanges.behavioralIndicators = { old: existing.behavioralIndicators, new: item.behavioralIndicators };

        if (Object.keys(fieldChanges).length > 0) {
          changes.push({ code: item.code, status: "updated", changes: fieldChanges, data: item });
        }
      }
    }

    // Detect deleted items (in DB but not in upload)
    for (const existing of existingItems) {
      if (!uploadedCodes.has(existing.code)) {
        changes.push({
          code: existing.code,
          status: "deleted",
          data: {
            code: existing.code,
            name: existing.name,
            type: existing.type,
            description: existing.description,
            behavioralIndicators: existing.behavioralIndicators,
          },
        });
      }
    }

    return NextResponse.json({
      changes,
      summary: {
        new: changes.filter((c) => c.status === "new").length,
        updated: changes.filter((c) => c.status === "updated").length,
        deleted: changes.filter((c) => c.status === "deleted").length,
        unchanged: uploadedItems.filter((u) => u.code && existingMap.has(u.code) && !changes.find((c) => c.code === u.code)).length,
      },
    });
  } catch (error) {
    console.error("[API] POST /api/kamus/preview failed:", error);
    return NextResponse.json(
      { error: "Failed to preview changes" },
      { status: 500 }
    );
  }
}
