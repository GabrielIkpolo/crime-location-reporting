import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helper";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getAuthSession(req);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;
    
    // Parse pagination params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "10")), 50);
    const skip = (page - 1) * limit;

    // Optional filters
    const statusFilter = searchParams.get("status") || undefined;
    
    // Build where clause
    const whereClause: any = { reporterId: userId };
    if (statusFilter && ["PENDING", "VERIFIED", "REJECTED", "CROWD_REPORTED"].includes(statusFilter)) {
      whereClause.status = statusFilter;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.report.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      reports,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + reports.length < total,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Reports/Me] Error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
