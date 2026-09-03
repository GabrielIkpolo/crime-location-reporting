import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * POST /api/auth/login
 * Standalone login endpoint for Flutter mobile app (Bearer token auth).
 * 
 * This is separate from NextAuth's [...nextauth] route because:
 * - NextAuth uses cookie-based auth + CSRF flow (browser-only)
 * - Flutter needs a simple email/password → JWT token exchange
 * 
 * The returned JWT is signed with the same NEXTAUTH_SECRET so that
 * auth-helper.ts can verify it using jose.
 */

// Simple in-memory rate limiter for login attempts (per IP)
const loginAttemptMap = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttemptMap.get(ip);

  if (!record || now > record.resetAt) {
    loginAttemptMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 min window
    return true;
  }

  if (record.count >= 5) {
    return false; // Rate limited
  }

  loginAttemptMap.set(ip, { count: record.count + 1, resetAt: record.resetAt });
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") 
      || req.headers.get("x-real-ip") 
      || "unknown";

    // Rate limit login attempts per IP address (same as credentials provider)
    if (!checkLoginRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: "Invalid input types." },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Verify password with bcrypt
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json(
        { 
          error: "Account suspended",
          isBanned: true,
          banReason: user.banReason || 'Your account has been suspended. Please contact support.'
        },
        { status: 403 }
      );
    }

    // Import jose for JWT signing (same secret as NextAuth)
    const { SignJWT } = await import("jose");
    const nextAuthSecret = process.env.NEXTAUTH_SECRET;

    if (!nextAuthSecret) {
      console.error("[Login] NEXTAUTH_SECRET is not set!");
      return NextResponse.json(
        { error: "Server configuration error." },
        { status: 500 }
      );
    }

    // Create JWT token with the same payload structure as NextAuth's JWT callback
    const token = await new SignJWT({
      id: user.id,
      email: user.email || "",
      name: user.name || "",
      role: user.role,
      image: user.image || null,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d") // Same as NextAuth session maxAge (30 days)
      .sign(new TextEncoder().encode(nextAuthSecret));

    return NextResponse.json(
      {
        message: "Login successful.",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.image,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Login] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
