import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const masterData = await prisma.masterData.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(masterData);
  } catch (error) {
    console.error("[API] GET /api/master-data failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch master data" },
      { status: 500 }
    );
  }
}
