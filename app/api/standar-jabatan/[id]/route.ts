import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.standarJabatan.findUnique({
      where: { id },
      include: {
        kompetensi: {
          include: { kamus: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Standar jabatan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("[API] GET /api/standar-jabatan/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch standar jabatan" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, level, description, kompetensi } = body;

    const existing = await prisma.standarJabatan.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Standar jabatan tidak ditemukan" }, { status: 404 });
    }

    // AC-18: Must have at least 1 kompetensi
    if (kompetensi && Array.isArray(kompetensi) && kompetensi.length === 0) {
      return NextResponse.json(
        { error: "Standar jabatan harus memiliki minimal 1 kompetensi/potensi" },
        { status: 400 }
      );
    }

    // AC-36: Check duplicate name (exclude current)
    if (name && name !== existing.name) {
      const duplicate = await prisma.standarJabatan.findUnique({ where: { name } });
      if (duplicate) {
        return NextResponse.json(
          { error: `Standar jabatan dengan nama '${name}' sudah ada` },
          { status: 400 }
        );
      }
    }

    const item = await prisma.$transaction(async (tx) => {
      // Delete existing kompetensi mappings if new ones provided
      if (kompetensi && Array.isArray(kompetensi)) {
        await tx.standarJabatanKompetensi.deleteMany({ where: { standarJabatanId: id } });
      }

      return tx.standarJabatan.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(level && { level }),
          ...(description && { description }),
          updatedBy: session.user.id,
          ...(kompetensi && Array.isArray(kompetensi) && {
            kompetensi: {
              create: kompetensi.map((k: { kamusId: string; expectedLevel: number }) => ({
                kamusId: k.kamusId,
                expectedLevel: k.expectedLevel || 1,
              })),
            },
          }),
        },
        include: {
          kompetensi: {
            include: { kamus: true },
          },
        },
      });
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("[API] PUT /api/standar-jabatan/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update standar jabatan" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const item = await prisma.standarJabatan.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Standar jabatan tidak ditemukan" }, { status: 404 });
    }

    // AC-19: Cannot delete if referenced by active project
    // For now, allow deletion since Project doesn't directly reference StandarJabatan yet

    await prisma.standarJabatan.delete({ where: { id } });
    return NextResponse.json({ message: "Standar jabatan berhasil dihapus" });
  } catch (error) {
    console.error("[API] DELETE /api/standar-jabatan/[id] failed:", error);
    return NextResponse.json(
      { error: "Gagal menghapus standar jabatan" },
      { status: 500 }
    );
  }
}
