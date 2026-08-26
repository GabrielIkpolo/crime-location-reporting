import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helper";
import logger from "@/lib/logger";

/**
 * GET /api/admin/dispatch/active
 * Get all active SOS alerts with reporter location.
 */
async function getActiveAlerts(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
  }

  try {
    const activeAlerts = await prisma.sosAlert.findMany({
      where: {
        status: { in: ["TRIGGERED", "ACKNOWLEDGED", "EN_ROUTE", "ON_SCENE"] },
      },
      orderBy: { triggeredAt: "desc" },
      include: {
        reporter: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ alerts: activeAlerts });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[DISPATCH_API] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/admin/dispatch/history?limit=50
 * Get recent SOS alert history.
 */
async function getHistory(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "50")), 200);

    const alerts = await prisma.sosAlert.findMany({
      orderBy: { triggeredAt: "desc" },
      take: limit,
      include: {
        reporter: { select: { name: true, email: true } },
        assignedTo: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[DISPATCH_HISTORY_API] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/admin/dispatch
 * Main handler — routes to active or history based on URL path.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  if (url.pathname.includes("/history")) {
    return getHistory(req);
  }
  return getActiveAlerts(req);
}
