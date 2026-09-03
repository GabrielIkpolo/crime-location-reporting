import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helper";
import prisma from "@/lib/prisma";

/**
 * GET /api/notifications?page=1&limit=20&isRead=&type=
 * Returns the authenticated user's notifications with pagination and filtering.
 * Supports both cookie-based (browser) and Bearer token (Flutter) auth.
 *
 * Query params:
 *   page    - Page number (default: 1)
 *   limit   - Items per page (default: 20, max: 100)
 *   isRead  - Filter by read status (true/false)
 *   type    - Filter by notification type
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAuthSession(req);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 100);
    const skip = (page - 1) * limit;

    // Optional filters
    const isReadFilter = searchParams.get("isRead");
    const typeFilter = searchParams.get("type");

    const whereClause: any = { userId: session.user.id };
    if (isReadFilter === "true") whereClause.isRead = true;
    else if (isReadFilter === "false") whereClause.isRead = false;
    if (typeFilter) whereClause.type = typeFilter;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications — Mark specific or all notifications as read.
 * Supports both cookie-based (browser) and Bearer token (Flutter) auth.
 *
 * Request Body:
 * {
 *   "notificationIds": ["id1", "id2"]  // Optional: mark specific notifications
 * }
 * If no notificationIds provided, marks ALL unread as read.
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getAuthSession(request);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationIds }: { notificationIds?: string[] } = body;

    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      // Mark specific notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId: session.user.id,
        },
        data: { isRead: true },
      });
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
