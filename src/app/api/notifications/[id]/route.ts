import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-helper";

/**
 * PATCH /api/notifications/[id] — Mark notification as read (browser clients)
 */
async function markAsRead(request: Request | NextRequest, userId: string, notificationId: string): Promise<NextResponse> {
  try {
    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: userId,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request | NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(request as NextRequest);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notificationId = (await params).id;
  return markAsRead(request, session.user.id, notificationId);
}

/**
 * PUT /api/notifications/[id] — Mark notification as read (Flutter clients)
 */
export async function PUT(request: Request | NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(request as NextRequest);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notificationId = (await params).id;
  return markAsRead(request, session.user.id, notificationId);
}

export async function DELETE(
  _request: Request | NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(_request as NextRequest);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notificationId = (await params).id;

    // Verify the notification belongs to the user
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: session.user.id,
      },
    });

    if (!notification) {
      return NextResponse.json(
        { error: "Notification not found" },
        { status: 404 }
      );
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
