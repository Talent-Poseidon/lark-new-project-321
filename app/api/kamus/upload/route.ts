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

function validateRows(rows: Record<string, unknown>[]): {
  valid: KamusRow[];
  errors: RowError[];
} {
  const valid: KamusRow[] = [];
  const errors: RowError[] = [];
  const seenCodes = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 because row 1 is header, data starts at row 2

    const code = String(row["code"] || row["Code"] || row["KODE"] || row["kode"] || "").trim();
    const name = String(row["name"] || row["Name"] || row["NAMA"] || row["nama"] || "").trim();
    const type = String(row["type"] || row["Type"] || row["TIPE"] || row["tipe"] || "").trim().toLowerCase();
    const description = String(row["description"] || row["Description"] || row["DESKRIPSI"] || row["deskripsi"] || "").trim();
    const behavioralIndicators = String(
      row["behavioralIndicators"] || row["Behavioral Indicators"] || row["INDIKATOR_PERILAKU"] || row["indikator_perilaku"] || row["behavioral_indicators"] || ""
    ).trim();

    let hasError = false;

    if (!code) {
      errors.push({ row: rowNum, field: "code", message: "Kode wajib diisi" });
      hasError = true;
    }
    if (!name) {
      errors.push({ row: rowNum, field: "name", message: "Nama wajib diisi" });
      hasError = true;
    }
    if (!type) {
      errors.push({ row: rowNum, field: "type", message: "Tipe wajib diisi" });
      hasError = true;
    } else if (type !== "potensi" && type !== "kompetensi") {
      errors.push({
        row: rowNum,
        field: "type",
        message: `Tipe harus 'potensi' atau 'kompetensi', ditemukan: '${type}'`,
      });
      hasError = true;
    }
    if (!description) {
      errors.push({ row: rowNum, field: "description", message: "Deskripsi wajib diisi" });
      hasError = true;
    }
    if (!behavioralIndicators) {
      errors.push({
        row: rowNum,
        field: "behavioralIndicators",
        message: "Indikator perilaku wajib diisi",
      });
      hasError = true;
    }

    if (code && seenCodes.has(code)) {
      errors.push({
        row: rowNum,
        field: "code",
        message: `Kode duplikat dalam file: '${code}'`,
      });
      hasError = true;
    }
    if (code) seenCodes.add(code);

    if (!hasError) {
      valid.push({ code, name, type, description, behavioralIndicators });
    }
  }

  return { valid, errors };
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
      return NextResponse.json(
        { error: "Format file harus .xlsx, .xls, atau .csv" },
        { status: 400 }
      );
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

    const { valid, errors } = validateRows(rows);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: "Validasi gagal", errors, validCount: valid.length, totalRows: rows.length },
        { status: 400 }
      );
    }

    // Check for duplicate codes in database
    const existingCodes = await prisma.kamus.findMany({
      where: { code: { in: valid.map((v) => v.code) } },
      select: { code: true },
    });

    if (existingCodes.length > 0) {
      const dupCodes = existingCodes.map((e) => e.code);
      return NextResponse.json(
        {
          error: "Kode duplikat ditemukan di database",
          errors: dupCodes.map((code) => ({
            row: valid.findIndex((v) => v.code === code) + 2,
            field: "code",
            message: `Kode '${code}' sudah ada di database`,
          })),
        },
        { status: 400 }
      );
    }

    // Store all valid rows
    await prisma.$transaction(async (tx) => {
      await tx.kamus.createMany({
        data: valid.map((item) => ({
          ...item,
          createdBy: session.user.id,
          updatedBy: session.user.id,
        })),
      });

      // Generate KamusSubmitted event
      await tx.domainEvent.create({
        data: {
          type: "KamusSubmitted",
          payload: {
            itemCount: valid.length,
            uploadedBy: session.user.id,
            timestamp: new Date().toISOString(),
          },
        },
      });
    });

    return NextResponse.json(
      { message: "Kamus berhasil diupload", count: valid.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/kamus/upload failed:", error);
    return NextResponse.json(
      { error: "Gagal memproses upload kamus" },
      { status: 500 }
    );
  }
}
