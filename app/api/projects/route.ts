import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        batches: {
          include: { invitations: true },
        },
        assessors: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        events: { orderBy: { createdAt: "desc" } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(projects);
  } catch (error) {
    console.error("[API] GET /api/projects failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
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
    const { name, description, batchName, participants, configuration } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // AC-17: Check master data availability before project creation
    const masterDataCount = await prisma.masterData.count({
      where: { isActive: true },
    });
    if (masterDataCount === 0) {
      return NextResponse.json(
        {
          error:
            "Master data is not available. Please set up master data (templates, competencies) before creating a project.",
        },
        { status: 400 }
      );
    }

    // AC-14/AC-16: Validate batch size - max 20 entries per batch
    if (participants && Array.isArray(participants) && participants.length > 20) {
      return NextResponse.json(
        {
          error:
            "A batch cannot exceed 20 participants. Please create multiple batches for additional participants.",
        },
        { status: 400 }
      );
    }

    // Create project with batch and invitations in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name,
          description: description || null,
          configuration: configuration || {},
          status: "active",
          createdById: session.user.id,
        },
      });

      // Create default batch if participants provided
      if (batchName || (participants && participants.length > 0)) {
        const batch = await tx.batch.create({
          data: {
            name: batchName || "Batch 1",
            projectId: newProject.id,
          },
        });

        // Create invitations for participants
        if (participants && Array.isArray(participants) && participants.length > 0) {
          await tx.invitation.createMany({
            data: participants.map(
              (p: { email: string; name: string }) => ({
                batchId: batch.id,
                email: p.email,
                name: p.name,
                status: "pending",
              })
            ),
          });
        }
      }

      // AC-2: Generate SubmitProject event
      await tx.domainEvent.create({
        data: {
          type: "SubmitProject",
          projectId: newProject.id,
          payload: {
            projectName: name,
            createdBy: session.user.id,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return tx.project.findUnique({
        where: { id: newProject.id },
        include: {
          batches: { include: { invitations: true } },
          assessors: true,
          events: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("[API] POST /api/projects failed:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
