import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { logAdminAction } from "@/lib/admin-logger";

/**
 * PATCH /api/admin/reports/bulk
 * 
 * Bulk approve or reject multiple reports at once.
 * 
 * Body:
 *   - reportIds: string[] — Array of report IDs to update
 *   - action: "approve" | "reject" — Action to perform
 *   - riskLevel?: "LOW" | "MEDIUM" | "HIGH" — Optional risk level (for approve)
 */

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Rate limiting for bulk operations (prevent abuse)
    const ip = req.headers.get("x-forwarded-for") 
      || req.headers.get("x-real-ip") 
      || "unknown";
    
    // Simple rate limit: max 5 bulk operations per minute per admin
    const rateLimitKey = `bulk_action_${session.user.id}`;
    const now = Date.now();
    const sessionData = req.cookies.get(rateLimitKey);
    
    if (sessionData) {
      const lastActionTime = parseInt(sessionData.value, 10);
      if (now - lastActionTime < 60000) {
        return NextResponse.json(
          { error: "Too many bulk operations. Please wait a moment." },
          { status: 429 }
        );
      }
    }

    // Set rate limit cookie for next minute
    const response = NextResponse.json({});
    response.cookies.set(rateLimitKey, now.toString(), { maxAge: 60 });

    const body = await req.json();
    const { reportIds, action, riskLevel } = body;

    // Validate input
    if (!Array.isArray(reportIds) || reportIds.length === 0) {
      return NextResponse.json(
        { error: "No report IDs provided" },
        { status: 400 }
      );
    }

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json(
        { error: "Invalid action. Must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    // Limit max reports per bulk operation to prevent abuse
    if (reportIds.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 reports per bulk operation" },
        { status: 400 }
      );
    }

    const newStatus = action === "approve" ? "VERIFIED" : "REJECTED";
    const finalRiskLevel = riskLevel || undefined;

    // Build update data
    const updateData: any = {
      status: newStatus,
    };

    if (finalRiskLevel) {
      updateData.riskLevel = finalRiskLevel;
    }

    // Perform bulk update using Prisma's updateMany
    const result = await prisma.report.updateMany({
      where: {
        id: { in: reportIds },
      },
      data: updateData,
    });

    // Create admin log entries for each updated report
    const logEntries = reportIds.map((reportId) => ({
      adminId: session.user.id!,
      reportId,
      action: `Bulk ${action}: ${newStatus}`,
      timestamp: new Date(),
    }));

    await prisma.adminLog.createMany({
      data: logEntries,
    });

    // Log the bulk operation itself
    await logAdminAction({
      adminId: session.user.id!,
      action: `Bulk ${action}: ${result.count} reports marked as ${newStatus}`,
    });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      action,
      status: newStatus,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Bulk Actions] Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/admin/reports/bulk?status=PENDING&riskLevel=HIGH
 * 
 * Get summary of reports that can be bulk-selected.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const riskLevel = searchParams.get("riskLevel");

    const whereClause: any = {};

    if (status) {
      whereClause.status = status;
    }

    if (riskLevel) {
      whereClause.riskLevel = riskLevel;
    }

    // Get count of matching reports for bulk selection preview
    const totalMatching = await prisma.report.count({ where: whereClause });

    return NextResponse.json({
      totalMatching,
      filters: { status, riskLevel },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Bulk Actions GET] Error:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
