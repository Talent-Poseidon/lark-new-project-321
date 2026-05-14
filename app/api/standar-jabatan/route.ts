import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get("level");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (level) {
      where.level = level;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.standarJabatan.findMany({
      where,
      include: {
        kompetensi: {
          include: {
            kamus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(items);
  } catch (error) {
    console.error("[API] GET /api/standar-jabatan failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch standar jabatan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, level, description, kompetensi } = body;

    if (!name || !level || !description) {
      return NextResponse.json(
        { error: "Nama, level, dan deskripsi wajib diisi" },
        { status: 400 }
      );
    }

    // AC-18: Must have at least 1 kompetensi
    if (!kompetensi || !Array.isArray(kompetensi) || kompetensi.length === 0) {
      return NextResponse.json(
        { error: "Standar jabatan harus memiliki minimal 1 kompetensi/potensi" },
        { status: 400 }
      );
    }

    // AC-31: Check that kamus has been submitted
    const kamusCount = await prisma.kamus.count();
    if (kamusCount === 0) {
      return NextResponse.json(
        { error: "Kamus belum tersedia. Lakukan Setup Kamus terlebih dahulu." },
        { status: 400 }
      );
    }

    // AC-36: Check duplicate name
    const existing = await prisma.standarJabatan.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: `Standar jabatan dengan nama '${name}' sudah ada` },
        { status: 400 }
      );
    }

    // Validate kamus IDs exist
    const kamusIds = kompetensi.map((k: { kamusId: string }) => k.kamusId);
    const validKamus = await prisma.kamus.findMany({
      where: { id: { in: kamusIds } },
      select: { id: true },
    });
    if (validKamus.length !== kamusIds.length) {
      return NextResponse.json(
        { error: "Beberapa item kamus tidak valid" },
        { status: 400 }
      );
    }

    const item = await prisma.$transaction(async (tx) => {
      const standar = await tx.standarJabatan.create({
        data: {
          name,
          level,
          description,
          createdBy: session.user.id,
          updatedBy: session.user.id,
          kompetensi: {
            create: kompetensi.map((k: { kamusId: string; expectedLevel: number }) => ({
              kamusId: k.kamusId,
              expectedLevel: k.expectedLevel || 1,
            })),
          },
        },
        include: {
          kompetensi: {
            include: { kamus: true },
          },
        },
      });

      // AC-15: Generate StandarSubmitted event
      await tx.domainEvent.create({
        data: {
          type: "StandarSubmitted",
          payload: {
            standarId: standar.id,
            name: standar.name,
            kompetensiCount: kompetensi.length,
            createdBy: session.user.id,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return standar;
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/standar-jabatan failed:", error);
    return NextResponse.json(
      { error: "Failed to create standar jabatan" },
      { status: 500 }
    );
  }
}
