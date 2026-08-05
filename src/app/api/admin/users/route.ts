import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-logger";
import { updateUserRoleSchema } from "@/lib/validations-admin";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count(),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
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
      adminId: session.user.id,
      action: `Updated user role to ${role}`,
      targetId: userId
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

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

  try {
    // Check if it's the admin themselves
    if (userId === session.user.id) {
      return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    // Log the deletion
    await logAdminAction({
      adminId: session.user.id,
      action: `Deleted user`,
      targetId: userId
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
