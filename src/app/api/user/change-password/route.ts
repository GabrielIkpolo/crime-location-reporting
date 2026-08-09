import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { rateLimits } from "@/lib/rate-limiter";
import logger from "@/lib/logger";

/**
 * Zod schema for password change validation.
 */
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string()
    .min(8, "New password must be at least 8 characters long.")
    .max(128, "New password must not exceed 128 characters.")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from the current password.",
  path: ["newPassword"],
});

/**
 * PUT /api/user/change-password
 * Changes the authenticated user's password after verifying the old one.
 * Rate-limited to prevent brute-force attacks.
 */
export async function PUT(req: Request) {
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

    // Rate limit: 5 attempts per 15 minutes per user (Audit fix Phase 3 #9)
    const rateLimit = await rateLimits.authLogin(userId);
    if (!rateLimit.allowed) {
      logger.warn({ userId }, "[ChangePassword] Rate limit exceeded");
      return NextResponse.json(
        { error: "Too many password change attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    // Verify user has a password (Google OAuth users don't have one)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true, email: true },
    });

    if (!user?.password) {
      return NextResponse.json(
        { error: "Password change is not available for accounts created via OAuth. Please set a password first." },
        { status: 400 }
      );
    }

    const body = await req.json();

    // Validate inputs with Zod
    const validationResult = changePasswordSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.issues[0]?.message || "Invalid input";
      logger.warn({ error: firstError, userId }, "[ChangePassword] Validation failed");
      return NextResponse.json(
        { error: firstError },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validationResult.data;

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);

    if (!isValid) {
      logger.warn({ userId }, "[ChangePassword] Invalid current password");
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    // Check that new password isn't the same (double-check after Zod)
    const sameAsOld = await bcrypt.compare(newPassword, user.password);
    if (sameAsOld) {
      return NextResponse.json(
        { error: "New password must be different from the current password." },
        { status: 400 }
      );
    }

    // Hash and set new password with bcrypt cost factor 12
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info({ userId }, "[ChangePassword] Password changed successfully");

    // Invalidate all existing sessions for security — user must re-login
    await prisma.session.deleteMany({
      where: { userId },
    });

    return NextResponse.json(
      { message: "Password changed successfully. Please log in again." },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage, userId }, "[ChangePassword] ERROR");
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
