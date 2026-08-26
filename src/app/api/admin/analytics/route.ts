import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helper";
import logger from "@/lib/logger";

/**
 * GET /api/admin/analytics?period=daily|weekly|monthly&dateFrom=&dateTo=
 * 
 * Returns aggregated analytics data for the admin dashboard.
 * This endpoint is optimized for Flutter mobile app consumption,
 * returning pre-computed aggregations instead of raw report data.
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const periods = ["daily", "weekly", "monthly"];
    const period = (searchParams.get("period") || "daily") as "daily" | "weekly" | "monthly";
    
    if (!periods.includes(period)) {
      return NextResponse.json(
        { error: `Invalid period. Must be one of: ${periods.join(", ")}` },
        { status: 400 }
      );
    }

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // Build where clause
    const whereClause: any = {};
    if (dateFrom) whereClause.createdAt = { ...whereClause.createdAt, gte: new Date(dateFrom) };
    if (dateTo)   whereClause.createdAt = { ...whereClause.createdAt, lte: new Date(dateTo) };

    // Fetch all reports in range
    const reports = await prisma.report.findMany({
      where: whereClause,
      select: {
        type: true,
        status: true,
        riskLevel: true,
        createdAt: true,
        location: true,
      },
    });

    // Aggregate data server-side (same logic as your existing chart components)
    const analytics = {
      overview: {
        totalReports: reports.length,
        verifiedCount: reports.filter(r => r.status === "VERIFIED").length,
        pendingCount: reports.filter(r => r.status === "PENDING").length,
        rejectedCount: reports.filter(r => r.status === "REJECTED").length,
      },
      byType: aggregateByType(reports),
      byRiskLevel: aggregateByRiskLevel(reports),
      byStatus: aggregateByStatus(reports),
      temporalTrends: aggregateTemporalTrends(reports, period),
    };

    return NextResponse.json(analytics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[ANALYTICS_API] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Helper functions (reuse patterns from your existing chart components)
function aggregateByType(reports: any[]) {
  const map = new Map<string, number>();
  reports.forEach(r => map.set(r.type, (map.get(r.type) || 0) + 1));
  return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
}

function aggregateByRiskLevel(reports: any[]) {
  const map = new Map<string, number>();
  reports.forEach(r => map.set(r.riskLevel, (map.get(r.riskLevel) || 0) + 1));
  return Array.from(map.entries()).map(([level, count]) => ({ level, count }));
}

function aggregateByStatus(reports: any[]) {
  const map = new Map<string, number>();
  reports.forEach(r => map.set(r.status, (map.get(r.status) || 0) + 1));
  return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
}

function aggregateTemporalTrends(reports: any[], period: string) {
  const map = new Map<string, number>();
  reports.forEach(r => {
    let key: string;
    if (period === "daily") {
      key = r.createdAt.toISOString().split("T")[0]; // YYYY-MM-DD
    } else if (period === "weekly") {
      const d = new Date(r.createdAt);
      key = `${d.getFullYear()}-W${String(Math.ceil((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 604800000)).padStart(2, '0')}`;
    } else {
      key = r.createdAt.toISOString().slice(0, 7); // YYYY-MM
    }
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([period, count]) => ({ period, count }));
}
