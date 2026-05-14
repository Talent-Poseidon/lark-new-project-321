import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// AC-34: Check readiness of master data for project creation
export async function GET() {
  try {
    const [kamusCount, standarCount, scenarioCount, kamusEvent, standarEvent, scenarioEvent] =
      await Promise.all([
        prisma.kamus.count(),
        prisma.standarJabatan.count(),
        prisma.scenario.count(),
        prisma.domainEvent.findFirst({
          where: { type: "KamusSubmitted" },
          orderBy: { createdAt: "desc" },
        }),
        prisma.domainEvent.findFirst({
          where: { type: "StandarSubmitted" },
          orderBy: { createdAt: "desc" },
        }),
        prisma.domainEvent.findFirst({
          where: { type: "ScenarioSubmitted" },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    const ready = kamusCount > 0 && standarCount > 0 && scenarioCount > 0;

    return NextResponse.json({
      ready,
      kamus: {
        count: kamusCount,
        submitted: !!kamusEvent,
        lastSubmittedAt: kamusEvent?.createdAt || null,
      },
      standarJabatan: {
        count: standarCount,
        submitted: !!standarEvent,
        lastSubmittedAt: standarEvent?.createdAt || null,
      },
      scenario: {
        count: scenarioCount,
        submitted: !!scenarioEvent,
        lastSubmittedAt: scenarioEvent?.createdAt || null,
      },
    });
  } catch (error) {
    console.error("[API] GET /api/master-data/readiness failed:", error);
    return NextResponse.json(
      { error: "Failed to check master data readiness" },
      { status: 500 }
    );
  }
}
