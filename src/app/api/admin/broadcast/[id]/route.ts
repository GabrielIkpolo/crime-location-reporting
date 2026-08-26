import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helper";
import logger from "@/lib/logger";

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
