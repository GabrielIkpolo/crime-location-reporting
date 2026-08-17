import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import axios from "axios";
import { rateLimits } from "@/lib/rate-limiter";

/**
 * POST /api/auth/register
 * Rate-limited user registration endpoint.
 * 
 * Flow:
 * 1. Validate input
 * 2. Create user in our database
 * 3. Register user on GikpsMail (required for email delivery)
 * 4. Send verification email via GikpsMail
 */

// GikpsMail configuration
const GIKPSMAIL_API_URL = process.env.GIKPSMAIL_API_URL?.replace(/\/+$/, "") || "";
const GIKPSMAIL_API_KEY = process.env.GIKPSMAIL_API_KEY || "";

/**
 * Register a user on the GikpsMail platform.
 * This is required because GikpsMail only delivers emails to registered users.
 */
async function registerOnGikpsMail(email: string, name: string): Promise<{ success: boolean; error?: string }> {
  if (!GIKPSMAIL_API_URL || !GIKPSMAIL_API_KEY) {
    console.warn("[Register] GikpsMail not configured — skipping user registration");
    return { success: false, error: "GikpsMail not configured" };
  }

  try {
    // Generate a username from the email (e.g., john.doe@gmail.com -> johndoe)
    const username = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    
    // Generate a temporary password for GikpsMail registration
    // In production, this would be sent to the user or managed differently
    const tempPassword = `gkps_${crypto.randomBytes(8).toString("hex")}`;

    const response = await axios.post(`${GIKPSMAIL_API_URL}/api/auth/register`, {
      email,
      password: tempPassword,
      name: name.trim(),
      username,
    }, {
      headers: { "X-API-Key": GIKPSMAIL_API_KEY },
      timeout: 30000,
    });

    if (response.data?.status === "success") {
      console.log(`[Register] ✅ User registered on GikpsMail: ${email} (${username})`);
      return { success: true };
    } else if (response.data?.error) {
      // Check if user already exists — that's fine too
      const errorMsg = response.data.error.toLowerCase();
      if (errorMsg.includes("already") || errorMsg.includes("exists")) {
        console.log(`[Register] ℹ️  User already on GikpsMail: ${email}`);
        return { success: true };
      }
      console.warn(`[Register] ⚠️ GikpsMail registration warning: ${response.data.error}`);
      // Don't fail — user might exist via other means
      return { success: true, error: response.data.error };
    }

    return { success: true };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || error.message;
      // If user already exists or other non-critical errors, continue
      if (message.toLowerCase().includes("already") || message.toLowerCase().includes("exists")) {
        console.log(`[Register] ℹ️  User already on GikpsMail: ${email}`);
        return { success: true };
      }
      console.warn(`[Register] ⚠️ GikpsMail registration failed (continuing): ${message}`);
    } else {
      console.warn(`[Register] ⚠️ GikpsMail registration error (continuing): ${error instanceof Error ? error.message : "Unknown"}`);
    }
    // Don't fail registration — continue with email sending
    return { success: false, error: error instanceof Error ? error.message : "Registration failed" };
  }
}

// Import crypto for temp password generation
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 registrations per 15 minutes per IP (Audit fix Phase 3 #4)
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const rateLimitResult = await rateLimits.registration(ip);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again in 15 minutes." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { name, email, password } = body;

    // Validate inputs
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters long." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Hash password with bcrypt cost factor 12
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user in our database
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: "USER",
      },
    });

    console.log(`[Register] ✅ User created in database: ${user.email} (id: ${user.id})`);

    // Register user on GikpsMail (required for email delivery)
    const gikpsResult = await registerOnGikpsMail(user.email!, user.name || "User");
    
    if (!gikpsResult.success && !gikpsResult.error?.toLowerCase().includes("not configured")) {
      console.warn(`[Register] ⚠️ GikpsMail registration issue: ${gikpsResult.error}`);
    }

    // Send verification email (non-blocking — don't fail registration if email fails)
    const { sendRegistrationVerificationEmail } = await import("@/lib/email-verification");
    const emailResult = await sendRegistrationVerificationEmail(
      user.id,
      user.email!,
      user.name || "User"
    );

    if (!emailResult.success) {
      console.error("[Register] Verification email failed:", emailResult.error);
      // Don't fail registration — log and continue
    } else {
      console.log(`[Register] ✅ Verification email sent to ${user.email}`);
    }

    return NextResponse.json(
      {
        message: "Registration successful. Please check your email to verify your account.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        needsVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Register] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
