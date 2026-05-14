import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const kamus = await prisma.kamus.findUnique({ where: { id } });
    if (!kamus) {
      return NextResponse.json({ error: "Kamus tidak ditemukan" }, { status: 404 });
    }

    // AC-8/AC-33: Check if kamus is referenced by StandarJabatan or Scenario
    const standarCount = await prisma.standarJabatanKompetensi.count({ where: { kamusId: id } });
    const scenarioCount = await prisma.scenarioKompetensi.count({ where: { kamusId: id } });
    if (standarCount > 0 || scenarioCount > 0) {
      return NextResponse.json(
        { error: "Kamus tidak dapat dihapus karena masih digunakan oleh Standar Jabatan atau Scenario" },
        { status: 400 }
      );
    }

    await prisma.kamus.delete({ where: { id } });
    return NextResponse.json({ message: "Kamus berhasil dihapus" });
  } catch (error) {
    console.error("[API] DELETE /api/kamus/[id] failed:", error);
    return NextResponse.json(
      { error: "Gagal menghapus kamus" },
      { status: 500 }
    );
  }
}
