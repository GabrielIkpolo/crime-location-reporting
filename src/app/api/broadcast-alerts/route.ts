import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * GET /api/broadcast-alerts
 * Public endpoint: Returns active broadcast alerts for the Flutter mobile app.
 * Used by the home dashboard to display recent safety alerts and broadcasts.
 */
export async function GET() {
  try {
    const broadcasts = await prisma.broadcastAlert.findMany({
      where: {
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
      take: 20, // Return up to 20 active broadcasts
      select: {
        id: true,
        title: true,
        message: true,
        priority: true,
        targetAudience: true,
        regionFilter: true,
        createdAt: true,
        sentAt: true,
        deliveredCount: true,
        createdBy: {
          select: {
            name: true,
          },
        },
      },
    });

    return NextResponse.json(broadcasts, { status: 200 });
  } catch (error) {
    console.error("[Broadcast Alerts] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
