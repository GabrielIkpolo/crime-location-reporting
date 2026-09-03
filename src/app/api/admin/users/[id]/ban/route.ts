import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession, isAdmin } from "@/lib/auth-helper";
import logger from "@/lib/logger";

/**
 * PUT /api/admin/users/[id]/ban
 * Ban a user account — admin only. Supports Bearer token auth for Flutter mobile admin features.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const userId = (await params).id;
    const body = await req.json();
    const { reason } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length < 2) {
      return NextResponse.json(
        { error: "A ban reason is required." },
        { status: 400 }
      );
    }

    // Prevent banning yourself
    const session = await getAuthSession(req);
    if (userId === session?.user?.id) {
      return NextResponse.json(
        { error: "You cannot ban yourself." },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isBanned: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: "This user is already banned." },
        { status: 400 }
      );
    }

    // Ban the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason.trim(),
        bannedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        bannedAt: true,
      },
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        adminId: session?.user?.id || "",
        action: `Banned user ${user.email} — Reason: ${reason}`,
      },
    });

    // Notify the banned user
    await prisma.notification.create({
      data: {
        userId,
        title: "Account Suspended",
        message: `Your account has been suspended. Reason: ${reason}`,
        type: "REPORT_STATUS_CHANGE",
      },
    });

    logger.info({ userId, adminId: session?.user?.id }, "[USERS_API] User banned");

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[USERS_BAN_API] ERROR");
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
