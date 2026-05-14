import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: List all assessors for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const assessors = await prisma.projectAssessor.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
    return NextResponse.json(assessors);
  } catch (error) {
    console.error("[API] GET /api/projects/[id]/assessors failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch assessors" },
      { status: 500 }
    );
  }
}

// POST: Assign assessors to a project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { userIds } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "userIds array is required" },
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

    // AC-13: Validate assessors exist in user database (master data)
    const validUsers = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    });

    if (validUsers.length === 0) {
      return NextResponse.json(
        { error: "No valid assessors found. Assessors must exist in the system." },
        { status: 400 }
      );
    }

    const invalidIds = userIds.filter(
      (uid: string) => !validUsers.find((u) => u.id === uid)
    );
    if (invalidIds.length > 0) {
      return NextResponse.json(
        {
          error: `Invalid assessor IDs: ${invalidIds.join(", ")}. Assessors must exist in master data.`,
        },
        { status: 400 }
      );
    }

    // Create assessor assignments (skip duplicates)
    const existingAssessors = await prisma.projectAssessor.findMany({
      where: { projectId, userId: { in: userIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existingAssessors.map((a) => a.userId));
    const newUserIds = userIds.filter((uid: string) => !existingIds.has(uid));

    if (newUserIds.length > 0) {
      await prisma.projectAssessor.createMany({
        data: newUserIds.map((userId: string) => ({
          projectId,
          userId,
        })),
      });
    }

    // AC-12: Generate AssessorAssigned event
    await prisma.domainEvent.create({
      data: {
        type: "AssessorAssigned",
        projectId,
        payload: {
          assessorIds: newUserIds,
          assignedCount: newUserIds.length,
          skippedCount: userIds.length - newUserIds.length,
          timestamp: new Date().toISOString(),
        },
      },
    });

    const allAssessors = await prisma.projectAssessor.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(
      {
        message: `${newUserIds.length} assessor(s) assigned successfully`,
        assessors: allAssessors,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[API] POST /api/projects/[id]/assessors failed:", error);
    return NextResponse.json(
      { error: "Failed to assign assessors" },
      { status: 500 }
    );
  }
}
