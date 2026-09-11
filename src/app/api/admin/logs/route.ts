import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";

/**
 * GET /api/admin/logs?page=1&limit=20&action=&adminId=&startDate=&endDate=
 * Admin-only: Fetch paginated admin audit logs.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      logger.warn({ ip: "unknown" }, "Unauthorized access attempt to GET /api/admin/logs");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "20")), 100);
    const skip = (page - 1) * limit;

    // Optional filters
    const action = searchParams.get("action") || undefined;
    const adminId = searchParams.get("adminId") || undefined;
    const reportId = searchParams.get("reportId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    // Build where clause
    const whereClause: Record<string, unknown> = {};
    
    if (action) {
      whereClause.action = { contains: action, mode: "insensitive" as const };
    }
    if (adminId) {
      whereClause.adminId = adminId;
    }
    if (reportId) {
      whereClause.reportId = reportId;
    }
    if (startDate || endDate) {
      whereClause.timestamp = {} as any;
      if (startDate) {
        (whereClause.timestamp as any).gte = new Date(startDate);
      }
      if (endDate) {
        (whereClause.timestamp as any).lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { timestamp: "desc" },
        include: {
          admin: { select: { id: true, name: true, email: true } },
          report: { select: { id: true, type: true, status: true } },
        },
      }),
      prisma.adminLog.count({ where: whereClause }),
    ]);

    logger.info(`Fetched admin logs: page=${page}, limit=${limit}, total=${total}`);

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: skip + logs.length < total,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "Error in GET /api/admin/logs");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
