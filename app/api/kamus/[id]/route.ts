import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const kamus = await prisma.kamus.findUnique({ where: { id } });
    if (!kamus) {
      return NextResponse.json({ error: "Kamus tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(kamus);
  } catch (error) {
    console.error("[API] GET /api/kamus/[id] failed:", error);
    return NextResponse.json(
      { error: "Gagal mengambil kamus" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const kamus = await prisma.kamus.findUnique({ where: { id } });
    if (!kamus) {
      return NextResponse.json({ error: "Kamus tidak ditemukan" }, { status: 404 });
    }

    // AC-8/AC-33: block deletion if referenced by StandarJabatan or Scenario
    const standarCount = await prisma.standarJabatanKompetensi.count({
      where: { kamusId: id },
    });
    const scenarioCount = await prisma.scenarioKompetensi.count({
      where: { kamusId: id },
    });

    if (standarCount > 0 || scenarioCount > 0) {
      const parts: string[] = [];
      if (standarCount > 0) parts.push(`${standarCount} Standar Jabatan`);
      if (scenarioCount > 0) parts.push(`${scenarioCount} Scenario`);
      return NextResponse.json(
        {
          error: `Kamus '${kamus.code}' tidak dapat dihapus karena masih digunakan oleh ${parts.join(" dan ")}.`,
          dependencies: { standarJabatan: standarCount, scenario: scenarioCount },
        },
        { status: 409 }
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
