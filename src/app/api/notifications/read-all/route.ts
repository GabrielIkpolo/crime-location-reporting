import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-helper";

/**
 * POST /api/notifications/read-all
 * Marks all notifications for the authenticated user as read.
 * Supports both cookie-based (browser) and Bearer token (Flutter) auth.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mark all notifications for this user as read
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark all notifications as read:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/read-all — alias for POST (backward compatibility)
 */
export async function PATCH(req: NextRequest) {
  return POST(req);
}
