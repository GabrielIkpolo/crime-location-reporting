import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { rateLimits } from "@/lib/rate-limiter";

/**
 * POST /api/auth/forgot-password
 * Creates a password reset token and returns it (in dev) or sends email (in prod).
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 requests per hour per IP (Audit fix Phase 3 #4)
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const rateLimitResult = await rateLimits.passwordReset(ip);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return success anyway to prevent email enumeration attacks
      return NextResponse.json(
        { message: "If an account with that email exists, a reset link has been sent." },
        { status: 200 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Delete any existing tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Create new reset token
    await prisma.passwordResetToken.create({
      data: {
        identifier: email,
        token,
        expires,
        userId: user.id,
      },
    });

    // In production, send an email with the reset link.
    // For development, return the token in the response so it can be used directly.
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password/${token}`;

    console.log(`[ForgotPassword] Reset link for ${email}:`, resetLink);

    // TODO (Production): Replace with actual email sending via Resend/SendGrid/Twilio
    // Example:
    // import { resend } from "@/lib/resend";
    // await resend.emails.send({
    //   from: "CrimeReport <noreply@crimereport.com>",
    //   to: email,
    //   subject: "Reset your CrimeReport password",
    //   html: `<p>Click here to reset your password: <a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p>`,
    // });

    return NextResponse.json(
      {
        message: "If an account with that email exists, a reset link has been sent.",
        // DEV ONLY — remove this in production!
        ...(process.env.NODE_ENV === "development" && { resetLink }),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[ForgotPassword] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
