import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const headers = [
      ["code", "name", "type", "description", "behavioralIndicators"],
      ["KMP-001", "Berpikir Analitis", "kompetensi", "Kemampuan menganalisis masalah secara sistematis", "Mampu mengidentifikasi akar masalah; Menggunakan data untuk pengambilan keputusan"],
      ["POT-001", "Daya Tahan Stres", "potensi", "Kemampuan mengelola tekanan kerja", "Tetap tenang dalam situasi tekanan; Mampu memprioritaskan tugas"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(headers);

    // Set column widths
    ws["!cols"] = [
      { wch: 12 },
      { wch: 25 },
      { wch: 15 },
      { wch: 50 },
      { wch: 60 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Kamus Template");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="kamus-template.xlsx"',
      },
    });
  } catch (error) {
    console.error("[API] GET /api/kamus/template failed:", error);
    return NextResponse.json(
      { error: "Failed to generate template" },
      { status: 500 }
    );
  }
}
