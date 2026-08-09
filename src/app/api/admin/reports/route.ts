import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/admin/reports?page=1&limit=10&status=&riskLevel=&type=&search=
 * 
 * Query params:
 *   page      - Page number (default: 1)
 *   limit     - Items per page (default: 10, max: 100)
 *   status    - Filter by status (PENDING, VERIFIED, REJECTED, CROWD_REPORTED)
 *   riskLevel - Filter by risk level (LOW, MEDIUM, HIGH)
 *   type      - Filter by report type
 *   search    - Search in description or type (partial match)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(searchParams.get("limit") || "10")), 100);
    const skip = (page - 1) * limit;

    // Filter params — server-side filtering for performance (Audit fix Phase 2 #2)
    const status = searchParams.get("status") || undefined;
    const riskLevel = searchParams.get("riskLevel") || undefined;
    const type = searchParams.get("type") || undefined;
    const search = searchParams.get("search") || undefined;

    // Build where clause for server-side filtering (Audit fix Phase 2 #2)
    const whereClause: any = {};
    
    if (status) {
      whereClause.status = status;
    }
    if (riskLevel) {
      whereClause.riskLevel = riskLevel;
    }
    if (type) {
      whereClause.type = type;
    }
    if (search) {
      // Search in description or type fields
      whereClause.OR = [
        { description: { contains: search, mode: "insensitive" } },
        { type: { contains: search, mode: "insensitive" } },
      ];
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
          _count: {
            select: { adminLogs: true }
          }
        },
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
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
