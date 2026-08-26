import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helper";
import logger from "@/lib/logger";

/**
 * PUT /api/admin/dispatch/[id]/status
 * Update the status of an SOS alert.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    const validStatuses = ["ACKNOWLEDGED", "EN_ROUTE", "ON_SCENE", "RESOLVED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "ACKNOWLEDGED") updateData.acknowledgedAt = new Date();
    if (status === "EN_ROUTE") updateData.enRouteAt = new Date();
    if (status === "ON_SCENE") updateData.onSceneAt = new Date();
    if (status === "RESOLVED") updateData.resolvedAt = new Date();
    if (status === "CANCELLED") updateData.cancelledAt = new Date();

    const updatedAlert = await prisma.sosAlert.update({ where: { id }, data: updateData });

    await prisma.notification.create({
      data: { userId: updatedAlert.reporterId, title: "SOS Alert Status Update", message: `Your SOS alert status is now: ${status.replace('_', ' ').toLowerCase()}.`, type: "SOS_RESPONSE", metadata: { sosAlertId: updatedAlert.sosAlertId } },
    });

    logger.info({ alertId: id, newStatus: status }, "[DISPATCH_API] SOS alert status updated");
    return NextResponse.json(updatedAlert);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[DISPATCH_STATUS_API] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
