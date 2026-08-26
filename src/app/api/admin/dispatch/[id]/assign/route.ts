import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helper";
import logger from "@/lib/logger";

/**
 * PUT /api/admin/dispatch/[id]/assign
 * Assign a responder to an SOS alert.
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
    const { responderId, notes } = body;

    if (!responderId) {
      return NextResponse.json({ error: "Responder ID is required" }, { status: 400 });
    }

    const responder = await prisma.user.findUnique({ where: { id: responderId } });
    if (!responder) {
      return NextResponse.json({ error: "Responder not found" }, { status: 404 });
    }

    const updatedAlert = await prisma.sosAlert.update({
      where: { id },
      data: { assignedResponderId: responderId, status: "ACKNOWLEDGED", acknowledgedAt: new Date() },
      include: { reporter: { select: { name: true, email: true } }, assignedTo: { select: { name: true, email: true } } },
    });

    await prisma.notification.create({
      data: { userId: updatedAlert.reporterId, title: "SOS Alert Acknowledged", message: `Your SOS alert has been acknowledged by ${responder.name || 'a responder'}.`, type: "SOS_RESPONSE", metadata: { sosAlertId: updatedAlert.sosAlertId } },
    });

    logger.info({ alertId: id, responderId }, "[DISPATCH_API] SOS alert assigned");
    return NextResponse.json(updatedAlert);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[DISPATCH_ASSIGN_API] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
