import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession, isAdmin } from "@/lib/auth-helper";
import logger from "@/lib/logger";

/**
 * POST /api/admin/broadcast
 * Create a new broadcast alert to push notifications to users.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    
    if (!session || !(await isAdmin(req))) {
      logger.warn("[BROADCAST_API] Unauthorized access attempt");
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, targetAudience, priority, regionFilter } = body;

    // Validate input
    if (!title || !message) {
      return NextResponse.json(
        { error: "Title and message are required" },
        { status: 400 }
      );
    }

    const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (priority && !validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${validPriorities.join(", ")}` },
        { status: 400 }
      );
    }

    const validAudiences = ["all", "region", "verified_users"];
    if (targetAudience && !validAudiences.includes(targetAudience)) {
      return NextResponse.json(
        { error: `Invalid target audience. Must be one of: ${validAudiences.join(", ")}` },
        { status: 400 }
      );
    }

    // Create broadcast alert in database
    const broadcast = await prisma.broadcastAlert.create({
      data: {
        title,
        message,
        targetAudience: targetAudience || "all",
        priority: (priority || "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        regionFilter: regionFilter || null,
        createdById: session.user.id,
      },
    });

    // Create notifications for affected users based on target audience
    try {
      let whereClause: any = {};
      
      if (targetAudience === "all") {
        // Notify all users
        const allUsers = await prisma.user.findMany({ select: { id: true } });
        for (const user of allUsers) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              title,
              message,
              type: "COMMUNITY_WARNING",
              metadata: { broadcastId: broadcast.id },
            },
          });
        }
      } else if (targetAudience === "verified_users") {
        // Notify users who have submitted verified reports
        const verifiedUsers = await prisma.user.findMany({
          where: {
            reports: {
              some: { status: "VERIFIED" }
            }
          },
          select: { id: true }
        });
        for (const user of verifiedUsers) {
          await prisma.notification.create({
            data: {
              userId: user.id,
              title,
              message,
              type: "COMMUNITY_WARNING",
              metadata: { broadcastId: broadcast.id },
            },
          });
        }
      } else if (targetAudience === "region" && regionFilter) {
        // For region-based targeting, we'd need to filter users by location
        // This is a placeholder — in production, integrate with FCM for push notifications
        logger.info("[BROADCAST_API] Region-based broadcast — FCM integration needed");
      }

      // Update delivered count
      await prisma.broadcastAlert.update({
        where: { id: broadcast.id },
        data: { sentAt: new Date() },
      });
    } catch (notifError) {
      logger.error({ error: notifError }, "[BROADCAST_API] Failed to create notifications");
      // Don't fail the whole request if notification creation fails
    }

    logger.info({ broadcastId: broadcast.id, title }, "[BROADCAST_API] Broadcast created successfully");
    return NextResponse.json(broadcast, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[BROADCAST_API] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/admin/broadcast
 * List all broadcast alerts (admin only).
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const broadcasts = await prisma.broadcastAlert.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(broadcasts);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[BROADCAST_API_GET] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}


