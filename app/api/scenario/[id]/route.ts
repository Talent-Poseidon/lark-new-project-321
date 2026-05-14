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
    const item = await prisma.scenario.findUnique({
      where: { id },
      include: {
        kompetensi: {
          include: { kamus: true },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Scenario tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("[API] GET /api/scenario/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenario" },
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
    const { name, type, description, duration, instructions, kompetensi } = body;

    const existing = await prisma.scenario.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Scenario tidak ditemukan" }, { status: 404 });
    }

    // AC-28: Must have at least 1 kompetensi
    if (kompetensi && Array.isArray(kompetensi) && kompetensi.length === 0) {
      return NextResponse.json(
        { error: "Scenario harus memiliki minimal 1 kompetensi/potensi" },
        { status: 400 }
      );
    }

    // AC-36: Check duplicate name (exclude current)
    if (name && name !== existing.name) {
      const duplicate = await prisma.scenario.findUnique({ where: { name } });
      if (duplicate) {
        return NextResponse.json(
          { error: `Scenario dengan nama '${name}' sudah ada` },
          { status: 400 }
        );
      }
    }

    const durationNum = duration ? Number(duration) : undefined;
    if (durationNum !== undefined && (isNaN(durationNum) || durationNum <= 0)) {
      return NextResponse.json(
        { error: "Durasi harus berupa angka positif (dalam menit)" },
        { status: 400 }
      );
    }

    const item = await prisma.$transaction(async (tx) => {
      if (kompetensi && Array.isArray(kompetensi)) {
        await tx.scenarioKompetensi.deleteMany({ where: { scenarioId: id } });
      }

      return tx.scenario.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(type && { type }),
          ...(description && { description }),
          ...(durationNum && { duration: durationNum }),
          ...(instructions && { instructions }),
          updatedBy: session.user.id,
          ...(kompetensi && Array.isArray(kompetensi) && {
            kompetensi: {
              create: kompetensi.map((k: { kamusId: string }) => ({
                kamusId: k.kamusId,
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
    console.error("[API] PUT /api/scenario/[id] failed:", error);
    return NextResponse.json(
      { error: "Failed to update scenario" },
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

    const item = await prisma.scenario.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: "Scenario tidak ditemukan" }, { status: 404 });
    }

    // AC-29: Cannot delete if referenced by active project
    // For now, allow deletion since Project doesn't directly reference Scenario yet

    await prisma.scenario.delete({ where: { id } });
    return NextResponse.json({ message: "Scenario berhasil dihapus" });
  } catch (error) {
    console.error("[API] DELETE /api/scenario/[id] failed:", error);
    return NextResponse.json(
      { error: "Gagal menghapus scenario" },
      { status: 500 }
    );
  }
}
