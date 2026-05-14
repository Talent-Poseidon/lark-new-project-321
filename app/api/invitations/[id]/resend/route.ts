import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST: Resend an expired invitation
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invitationId } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: { batch: { select: { projectId: true } } },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // AC-9: Only resend expired invitations
    if (invitation.status !== "expired") {
      return NextResponse.json(
        { error: "Only expired invitations can be resent" },
        { status: 400 }
      );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const updated = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: "sent",
        sentAt: now,
        expiresAt,
      },
    });

    // Generate AssesseeNotified event for resend
    await prisma.domainEvent.create({
      data: {
        type: "AssesseeNotified",
        projectId: invitation.batch.projectId,
        payload: {
          invitationId,
          resent: true,
          sentAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      },
    });

    console.log(
      `[Invitation] Resent invitation ${invitationId} via external system`
    );

    return NextResponse.json({
      message: "Invitation resent successfully",
      invitation: updated,
    });
  } catch (error) {
    console.error("[API] POST /api/invitations/[id]/resend failed:", error);
    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
