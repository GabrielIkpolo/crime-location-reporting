import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-helper";

/**
 * GET /api/user/profile
 * Returns the authenticated user's profile data with related entities.
 * Supports both cookie-based (browser) and Bearer token (Flutter) auth.
 * 
 * Response includes:
 * - User basic info (id, name, email, role, etc.)
 * - Emergency contacts count
 * - Notification preferences
 * - Report statistics
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        role: true,
        isBanned: true,
        banReason: true,
        bannedAt: true,
        createdAt: true,
        _count: {
          select: {
            reports: true,
            sosEmergencyContacts: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 404 }
      );
    }

    // Get notification preferences
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    });

    return NextResponse.json(
      {
        user,
        preferences: preferences || null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GetProfile] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/user/profile (and PATCH)
 * Updates the authenticated user's profile (name).
 * Supports both cookie-based (browser) and Bearer token (Flutter) auth.
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getAuthSession(req);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name } = body;

    // Validate input
    if (name === undefined || name === null) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    if (typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters long." },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Name must not exceed 100 characters." },
        { status: 400 }
      );
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
      },
    });

    return NextResponse.json(
      { message: "Profile updated successfully.", user: updatedUser },
      { status: 200 }
    );
  } catch (error) {
    console.error("[UpdateProfile] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile — alias for PUT (same behavior)
 * Kept for backward compatibility with existing web clients.
 */
export async function PATCH(req: NextRequest) {
  return PUT(req);
}
