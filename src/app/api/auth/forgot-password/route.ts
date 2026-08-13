import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";
import { rateLimits } from "@/lib/rate-limiter";
import { sendPasswordResetEmailWorkflow } from "@/lib/email-verification";

/**
 * POST /api/auth/forgot-password
 * Creates a password reset token and sends email via GikpsMail.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 requests per hour per IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
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

    // Find user by email (case-insensitive)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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
        identifier: email.toLowerCase(),
        token,
        expires,
        userId: user.id,
      },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password/${token}`;

    // Send email via GikpsMail (non-blocking — don't fail if email fails)
    const emailResult = await sendPasswordResetEmailWorkflow(user.id, email.toLowerCase());
    
    if (!emailResult.success) {
      console.error("[ForgotPassword] Email delivery failed:", emailResult.error);
      // Still return success to prevent email enumeration
    }

    // In development, include the reset link for testing
    const response: Record<string, unknown> = {
      message: "If an account with that email exists, a reset link has been sent.",
    };

    if (process.env.NODE_ENV === "development") {
      response.resetLink = resetLink;
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[ForgotPassword] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
