import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { rateLimits } from "@/lib/rate-limiter";

/**
 * POST /api/auth/verify-email/send
 * Resends the email verification link to a user.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 requests per hour per IP
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

    // Find user by email (case-insensitive)
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "If an account with that email exists, a verification link has been sent." },
        { status: 200 }
      );
    }

    // If already verified, let them know
    if (user.emailVerified) {
      return NextResponse.json(
        { message: "This email is already verified.", needsResend: false },
        { status: 200 }
      );
    }

    // Import here to avoid circular dependency issues
    const { resendVerificationEmail } = await import("@/lib/email-verification");
    
    const result = await resendVerificationEmail(user.id, email.toLowerCase(), user.name || "User");

    if (!result.success) {
      console.error("[VerifyEmailResend] Failed:", result.error);
      // Still return success to prevent email enumeration
    }

    return NextResponse.json({
      message: "If an account with that email exists, a verification link has been sent.",
      needsResend: true,
    }, { status: 200 });
  } catch (error) {
    console.error("[VerifyEmailResend] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
