import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET: List all invitations for a project
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const batches = await prisma.batch.findMany({
      where: { projectId },
      include: { invitations: { orderBy: { createdAt: "desc" } } },
    });
    const invitations = batches.flatMap((b) => b.invitations);
    return NextResponse.json(invitations);
  } catch (error) {
    console.error("[API] GET /api/projects/[id]/invitations failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch invitations" },
      { status: 500 }
    );
  }
}

// POST: Send invitations to participants
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const { invitationIds } = body;

    if (!invitationIds || !Array.isArray(invitationIds) || invitationIds.length === 0) {
      return NextResponse.json(
        { error: "invitationIds array is required" },
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

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update invitations to "sent" status with expiry
    const updated = await prisma.invitation.updateMany({
      where: {
        id: { in: invitationIds },
        batch: { projectId },
        status: { in: ["pending", "expired"] }, // Can resend expired ones
      },
      data: {
        status: "sent",
        sentAt: now,
        expiresAt,
      },
    });

    // AC-7: Generate AssesseeNotified event
    await prisma.domainEvent.create({
      data: {
        type: "AssesseeNotified",
        projectId,
        payload: {
          invitationIds,
          sentCount: updated.count,
          sentAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    // In a real system, this would integrate with an external email/messaging service
    console.log(
      `[Invitation] Sent ${updated.count} invitations for project ${projectId} via external system`
    );

    return NextResponse.json(
      {
        message: `${updated.count} invitation(s) sent successfully`,
        sentCount: updated.count,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] POST /api/projects/[id]/invitations failed:", error);
    return NextResponse.json(
      { error: "Failed to send invitations" },
      { status: 500 }
    );
  }
}
