import { NextRequest, NextResponse } from "next/server";
import { getAuthSession, isAdmin } from "@/lib/auth-helper";
import prisma from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-logger";
import { updateUserRoleSchema } from "@/lib/validations-admin";

/**
 * GET /api/admin/users?page=1&limit=10&search=&role=
 * Admin-only: List all users with pagination.
 * Supports both cookie-based (browser) and Bearer token (Flutter) auth.
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "10")), 100);
    const skip = (page - 1) * limit;

    // Optional filters
    const search = searchParams.get("search") || undefined;
    const role = searchParams.get("role") || undefined;

    // Build where clause
    const whereClause: any = {};
    if (role) whereClause.role = role;
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          role: true,
          image: true,
          createdAt: true,
          _count: { select: { reports: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + users.length < total,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users — Update user role.
 * Admin-only. Supports Bearer token auth for Flutter mobile admin features.
 */
export async function PATCH(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const session = await getAuthSession(req);
    const body = await req.json();

    // Validate input with zod
    const validation = updateUserRoleSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "Invalid user update data";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { userId, role } = validation.data;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });

    // Log the role change
    await logAdminAction({
      adminId: session?.user?.id || "",
      action: `Updated user role to ${role}`,
      targetId: userId
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Admin Users] Failed to update user role:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users?userId=xxx
 * Admin-only: Delete a user account.
 * Supports Bearer token auth for Flutter mobile admin features.
 */
export async function DELETE(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const session = await getAuthSession(req);
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      return NextResponse.json({ error: "Invalid user ID format" }, { status: 400 });
    }

    // Check if it's the admin themselves
    if (userId === session?.user?.id) {
      return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    // Log the deletion
    await logAdminAction({
      adminId: session?.user?.id || "",
      action: `Deleted user`,
      targetId: userId
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
