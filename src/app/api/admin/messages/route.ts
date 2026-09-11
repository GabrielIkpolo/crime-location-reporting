import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession, isAdmin } from "@/lib/auth-helper";

/**
 * GET /api/admin/messages?page=1&limit=10&isRead=false&search=
 * Admin-only: List contact messages with pagination.
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
    const isReadParam = searchParams.get("isRead");
    const search = searchParams.get("search") || undefined;

    // Build where clause
    const whereClause: any = {};
    if (isReadParam === "true") whereClause.isRead = true;
    else if (isReadParam === "false") whereClause.isRead = false;

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ];
    }

    const [messages, total] = await Promise.all([
      prisma.contactMessage.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.contactMessage.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      messages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + messages.length < total,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
