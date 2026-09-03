import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession, isAdmin } from "@/lib/auth-helper";
import logger from "@/lib/logger";

/**
 * PUT /api/admin/users/[id]/unban
 * Unban a user account — admin only. Supports Bearer token auth for Flutter mobile admin features.
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
    const session = await getAuthSession(req);

    // Check if user exists and is banned
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, isBanned: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (!user.isBanned) {
      return NextResponse.json(
        { error: "This user is not currently banned." },
        { status: 400 }
      );
    }

    // Unban the user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        banReason: null,
        bannedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
      },
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        adminId: session?.user?.id || "",
        action: `Unbanned user ${user.email}`,
      },
    });

    // Notify the unbanned user
    await prisma.notification.create({
      data: {
        userId,
        title: "Account Reactivated",
        message: "Your account has been reactivated. You can now log in again.",
        type: "REPORT_STATUS_CHANGE",
      },
    });

    logger.info({ userId, adminId: session?.user?.id }, "[USERS_API] User unbanned");

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[USERS_UNBAN_API] ERROR");
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
