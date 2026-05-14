import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: Add a new batch with participants to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { name, participants } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Batch name is required" },
        { status: 400 }
      );
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // AC-14/AC-16: Backend validation - max 20 entries per batch
    if (participants && Array.isArray(participants) && participants.length > 20) {
      return NextResponse.json(
        {
          error:
            "A batch cannot exceed 20 participants. Please create a new batch for additional participants.",
        },
        { status: 400 }
      );
    }

    const batch = await prisma.$transaction(async (tx) => {
      const newBatch = await tx.batch.create({
        data: {
          name,
          projectId,
        },
      });

      if (participants && Array.isArray(participants) && participants.length > 0) {
        await tx.invitation.createMany({
          data: participants.map(
            (p: { email: string; name: string }) => ({
              batchId: newBatch.id,
              email: p.email,
              name: p.name,
              status: "pending",
            })
          ),
        });
      }

      return tx.batch.findUnique({
        where: { id: newBatch.id },
        include: { invitations: true },
      });
    });

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/projects/[id]/batches failed:", error);
    return NextResponse.json(
      { error: "Failed to create batch" },
      { status: 500 }
    );
  }
}
