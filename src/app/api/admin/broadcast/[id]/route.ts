import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession, isAdmin } from "@/lib/auth-helper";
import logger from "@/lib/logger";

/**
 * PATCH /api/admin/broadcast/[id]
 * Toggle active/inactive status of a broadcast alert (admin only).
 * Supports Bearer token auth for Flutter mobile admin features.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const broadcastId = (await params).id;
    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: "isActive must be a boolean value." },
        { status: 400 }
      );
    }

    const broadcast = await prisma.broadcastAlert.findUnique({
      where: { id: broadcastId },
    });

    if (!broadcast) {
      return NextResponse.json(
        { error: "Broadcast not found." },
        { status: 404 }
      );
    }

    const updated = await prisma.broadcastAlert.update({
      where: { id: broadcastId },
      data: { isActive },
    });

    logger.info(
      { broadcastId, isActive },
      `[BROADCAST_API] Broadcast ${isActive ? 'activated' : 'deactivated'}`
    );

    return NextResponse.json({ success: true, broadcast: updated });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[BROADCAST_API_PATCH] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/broadcast/[id]
 * Delete a broadcast alert (admin only).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { id } = await params;

    await prisma.broadcastAlert.updateMany({
      where: { id },
      data: { isActive: false }, // Soft delete
    });

    logger.info({ broadcastId: id }, "[BROADCAST_API] Broadcast deleted");
    return NextResponse.json({ message: "Broadcast deleted successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[BROADCAST_API_DELETE] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
