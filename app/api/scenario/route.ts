import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.scenario.findMany({
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
    console.error("[API] GET /api/scenario failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch scenario" },
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
    const { name, type, description, duration, instructions, kompetensi } = body;

    if (!name || !type || !description || !duration || !instructions) {
      return NextResponse.json(
        { error: "Semua field wajib diisi (nama, tipe, deskripsi, durasi, instruksi)" },
        { status: 400 }
      );
    }

    // AC-28: Must have at least 1 kompetensi
    if (!kompetensi || !Array.isArray(kompetensi) || kompetensi.length === 0) {
      return NextResponse.json(
        { error: "Scenario harus memiliki minimal 1 kompetensi/potensi" },
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
    const existing = await prisma.scenario.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json(
        { error: `Scenario dengan nama '${name}' sudah ada` },
        { status: 400 }
      );
    }

    // Validate duration is a positive number
    const durationNum = Number(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      return NextResponse.json(
        { error: "Durasi harus berupa angka positif (dalam menit)" },
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
      const scenario = await tx.scenario.create({
        data: {
          name,
          type,
          description,
          duration: durationNum,
          instructions,
          createdBy: session.user.id,
          updatedBy: session.user.id,
          kompetensi: {
            create: kompetensi.map((k: { kamusId: string }) => ({
              kamusId: k.kamusId,
            })),
          },
        },
        include: {
          kompetensi: {
            include: { kamus: true },
          },
        },
      });

      // AC-25: Generate ScenarioSubmitted event
      await tx.domainEvent.create({
        data: {
          type: "ScenarioSubmitted",
          payload: {
            scenarioId: scenario.id,
            name: scenario.name,
            kompetensiCount: kompetensi.length,
            createdBy: session.user.id,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return scenario;
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/scenario failed:", error);
    return NextResponse.json(
      { error: "Failed to create scenario" },
      { status: 500 }
    );
  }
}
