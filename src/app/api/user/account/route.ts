import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimits, checkRateLimit } from "@/lib/rate-limiter";
import logger from "@/lib/logger";

/**
 * Zod schema for account deletion validation.
 */
const deleteAccountSchema = z.object({
  confirmDelete: z.literal(true),
  password: z.string().min(1, "Password is required to confirm account deletion."),
}).refine((data) => data.confirmDelete === true, {
  message: "Account deletion requires explicit confirmation.",
});

/**
 * DELETE /api/user/account
 * Permanently deletes the authenticated user's account and all associated data.
 * Rate-limited to prevent accidental mass deletions.
 */
export async function DELETE(req: Request) {
  let userId: string | undefined;

  try {
    const session = await auth();
    userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Rate limit: 3 attempts per hour — prevents accidental mass deletions
    const rateLimit = await rateLimits.passwordReset(userId!);
    if (!rateLimit.allowed) {
      logger.warn({ userId }, "[DeleteAccount] Rate limit exceeded");
      return NextResponse.json(
        { error: "Too many deletion attempts. Please try again in 1 hour." },
        { status: 429 }
      );
    }

    // Verify user exists and get details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        password: true, 
        email: true, 
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { reports: true } }
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    const body = await req.json();

    // Validate inputs with Zod
    const validationResult = deleteAccountSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Invalid input";
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      );
    }

    // Verify password for accounts with passwords
    if (user.password) {
      const isValid = await bcrypt.compare(body.password, user.password);
      if (!isValid) {
        logger.warn({ userId }, "[DeleteAccount] Incorrect password");
        return NextResponse.json(
          { error: "Password is incorrect. Account deletion cancelled." },
          { status: 401 }
        );
      }
    }

    // Log the deletion action for audit trail (before deleting)
    logger.warn({
      userId,
      userEmail: user.email,
      userName: user.name,
      role: user.role,
      reportCount: user._count.reports,
      accountAgeDays: Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    }, "[DeleteAccount] Account deletion initiated");

    // Delete all associated data (cascade is handled by Prisma relations):
    // - Accounts (onDelete: Cascade)
    // - Sessions (onDelete: Cascade) — user will be logged out everywhere
    // - Reports: anonymize instead of hard-delete for audit integrity
    await prisma.report.updateMany({
      where: { reporterId: userId },
      data: { 
        reporterId: null, 
        isAnonymous: true,
        description: "[Account deleted] Report content removed by user",
      },
    });

    // Delete admin logs associated with this user (as admin)
    await prisma.adminLog.deleteMany({
      where: { adminId: userId },
    });

    // Finally, delete the user account
    await prisma.user.delete({
      where: { id: userId },
    });

    logger.info({ userId }, "[DeleteAccount] Account permanently deleted");

    return NextResponse.json(
      { message: "Your account and all associated data have been permanently deleted." },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage, userId }, "[DeleteAccount] ERROR");
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
