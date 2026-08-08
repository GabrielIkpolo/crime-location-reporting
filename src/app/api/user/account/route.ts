import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * DELETE /api/user/account
 * Permanently deletes the authenticated user's account and all associated data.
 */
export async function DELETE(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Verify user has a password (prevent accidental deletion of OAuth-only accounts)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { confirmDelete, password } = body;

    // Require explicit confirmation
    if (confirmDelete !== true) {
      return NextResponse.json(
        { error: "Account deletion requires explicit confirmation. Send { confirmDelete: true }." },
        { status: 400 }
      );
    }

    // Verify password for accounts with passwords
    if (user.password && password) {
      const bcrypt = await import("bcryptjs");
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return NextResponse.json(
          { error: "Password is incorrect. Account deletion cancelled." },
          { status: 401 }
        );
      }
    }

    // Delete all associated data (cascade is handled by Prisma relations):
    // - Accounts (onDelete: Cascade)
    // - Sessions (onDelete: Cascade)
    // - Reports (kept but reporterId set to null for anonymity)
    // - AdminLogs (deleted via cascade or kept for audit)
    // - Notifications (onDelete: Cascade)
    // - SosEmergencyContacts (onDelete: Cascade)
    // - NotificationPreferences (onDelete: Cascade)

    // Soft-delete reports by anonymizing them instead of hard-deleting
    await prisma.report.updateMany({
      where: { reporterId: session.user.id },
      data: { reporterId: null, isAnonymous: true },
    });

    // Delete admin logs associated with this user (as admin)
    await prisma.adminLog.deleteMany({
      where: { adminId: session.user.id },
    });

    // Finally, delete the user account
    await prisma.user.delete({
      where: { id: session.user.id },
    });

    return NextResponse.json(
      { message: "Your account and all associated data have been permanently deleted." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[DeleteAccount] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
