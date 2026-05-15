import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

interface ChangePayload {
  code: string;
  status: "new" | "updated" | "deleted";
  data: {
    code: string;
    name: string;
    type: string;
    description: string;
    behavioralIndicators: string;
  };
}

interface ConfirmBody {
  changes: ChangePayload[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as ConfirmBody;
    if (!body || !Array.isArray(body.changes)) {
      return NextResponse.json(
        { error: "Body harus memuat array 'changes'" },
        { status: 400 }
      );
    }

    const newItems = body.changes.filter((c) => c.status === "new");
    const updatedItems = body.changes.filter((c) => c.status === "updated");
    const deletedItems = body.changes.filter((c) => c.status === "deleted");

    // AC-8/AC-33: block delete-by-reupload when items are used
    if (deletedItems.length > 0) {
      const codesToDelete = deletedItems.map((d) => d.code);
      const inUse = await prisma.kamus.findMany({
        where: { code: { in: codesToDelete } },
        select: {
          id: true,
          code: true,
          _count: {
            select: { standarJabatanItems: true, scenarioItems: true },
          },
        },
      });

      const blocked = inUse.filter(
        (k) => k._count.standarJabatanItems > 0 || k._count.scenarioItems > 0
      );

      if (blocked.length > 0) {
        return NextResponse.json(
          {
            error:
              "Beberapa kamus tidak dapat dihapus karena masih digunakan oleh Standar Jabatan atau Scenario",
            blocked: blocked.map((k) => ({
              code: k.code,
              standarJabatan: k._count.standarJabatanItems,
              scenario: k._count.scenarioItems,
            })),
          },
          { status: 409 }
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const created: string[] = [];
      const updated: string[] = [];
      const deleted: string[] = [];

      for (const c of newItems) {
        await tx.kamus.create({
          data: {
            code: c.data.code,
            name: c.data.name,
            type: c.data.type,
            description: c.data.description,
            behavioralIndicators: c.data.behavioralIndicators,
            createdBy: session.user.id,
            updatedBy: session.user.id,
          },
        });
        created.push(c.data.code);
      }

      for (const c of updatedItems) {
        await tx.kamus.update({
          where: { code: c.data.code },
          data: {
            name: c.data.name,
            type: c.data.type,
            description: c.data.description,
            behavioralIndicators: c.data.behavioralIndicators,
            updatedBy: session.user.id,
          },
        });
        updated.push(c.data.code);
      }

      for (const c of deletedItems) {
        await tx.kamus.delete({ where: { code: c.code } });
        deleted.push(c.code);
      }

      await tx.domainEvent.create({
        data: {
          type: "KamusSubmitted",
          payload: {
            mode: "update",
            createdCount: created.length,
            updatedCount: updated.length,
            deletedCount: deleted.length,
            uploadedBy: session.user.id,
            timestamp: new Date().toISOString(),
          },
        },
      });

      return { created, updated, deleted };
    });

    return NextResponse.json(
      {
        message: "Perubahan kamus berhasil diterapkan",
        ...result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] POST /api/kamus/upload/confirm failed:", error);
    return NextResponse.json(
      { error: "Gagal menerapkan perubahan kamus" },
      { status: 500 }
    );
  }
}
