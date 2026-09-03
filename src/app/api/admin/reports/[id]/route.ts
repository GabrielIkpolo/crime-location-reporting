import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-helper";

/**
 * GET /api/admin/reports/[id]
 * Admin-only: Get full report details including reporter info.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
        adminLogs: {
          orderBy: { timestamp: "desc" },
          take: 10,
        },
      },
    });

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    return NextResponse.json(report);
  } catch (err: unknown) {
    console.error("[GET Admin Report] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/reports/[id]
 * Admin-only: Update report status and/or risk level.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, riskLevel } = body;

    // Validate enum values
    const validStatuses = ["PENDING", "VERIFIED", "REJECTED", "CROWD_REPORTED"];
    const validRiskLevels = ["LOW", "MEDIUM", "HIGH"];

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
    }
    if (riskLevel && !validRiskLevels.includes(riskLevel)) {
      return NextResponse.json({ error: `Invalid risk level. Must be one of: ${validRiskLevels.join(", ")}` }, { status: 400 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (riskLevel) updateData.riskLevel = riskLevel;

    // Add to verificationHistory if status changed
    if (status && status !== "PENDING") {
      const historyEntry = {
        action: `Status changed to ${status}`,
        performedBy: session.user.id,
        timestamp: new Date().toISOString(),
        notes: body.adminNotes || "",
      };

      // Get existing history and append
      const existingReport = await prisma.report.findUnique({
        where: { id },
        select: { verificationHistory: true },
      });

      let history: any[] = [];
      if (existingReport?.verificationHistory) {
        const parsed = JSON.parse(JSON.stringify(existingReport.verificationHistory));
        if (typeof parsed === "string") {
          try {
            history = JSON.parse(parsed);
            if (!Array.isArray(history)) history = [parsed];
          } catch {
            history = [parsed];
          }
        } else if (Array.isArray(parsed)) {
          history = parsed;
        } else {
          history = [parsed];
        }
      }
      history.push(historyEntry);

      updateData.verificationHistory = JSON.stringify(history);
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: updateData,
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        reportId: id,
        action: `Report ${status || "updated"} (riskLevel: ${riskLevel || "unchanged"})`,
      },
    });

    // Create notification for the reporter if status changed
    if (status) {
      const reporterId = updatedReport.reporterId;
      if (reporterId) {
        await prisma.notification.create({
          data: {
            userId: reporterId,
            title: `Report ${status}`,
            message: `Your report has been marked as ${status.toLowerCase()}.`,
            type: status === "VERIFIED" ? "HOTSPOT_ALERT" : "REPORT_STATUS_CHANGE",
          },
        });
      }
    }

    return NextResponse.json(updatedReport);
  } catch (err: unknown) {
    console.error("[PATCH Admin Report] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PUT /api/admin/reports/[id]/verify
 * Admin-only: Approve a report (set status=VERIFIED).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const adminNotes = body.adminNotes || "";

    // Add to verificationHistory
    const historyEntry = {
      action: "Report verified",
      performedBy: session.user.id,
      timestamp: new Date().toISOString(),
      notes: adminNotes,
    };

    const existingReport = await prisma.report.findUnique({
      where: { id },
      select: { verificationHistory: true, reporterId: true },
    });

    if (!existingReport) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    let history: any[] = [];
    if (existingReport.verificationHistory) {
      const parsed = JSON.parse(JSON.stringify(existingReport.verificationHistory));
      if (typeof parsed === "string") {
        try {
          history = JSON.parse(parsed);
          if (!Array.isArray(history)) history = [parsed];
        } catch {
          history = [parsed];
        }
      } else if (Array.isArray(parsed)) {
        history = parsed;
      } else {
        history = [parsed];
      }
    }
    history.push(historyEntry);

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: "VERIFIED",
        verificationHistory: JSON.stringify(history),
      },
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        reportId: id,
        action: `Report verified${adminNotes ? ` — ${adminNotes}` : ""}`,
      },
    });

    // Create notification for the reporter
    if (updatedReport.reporterId) {
      await prisma.notification.create({
        data: {
          userId: updatedReport.reporterId,
          title: "Report Verified",
          message: `Your report has been verified and is now visible to the community.`,
          type: "HOTSPOT_ALERT",
          metadata: { reportId: id },
        },
      });
    }

    return NextResponse.json({ success: true, report: updatedReport });
  } catch (err: unknown) {
    console.error("[PUT Verify Report] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/admin/reports/[id]/dismiss
 * Admin-only: Reject a report (set status=REJECTED) with reason.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getAuthSession(req);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const reason = body.reason || "";
    const adminNotes = body.adminNotes || "";

    if (!reason) {
      return NextResponse.json({ error: "Reason is required for dismissal." }, { status: 400 });
    }

    // Add to verificationHistory
    const historyEntry = {
      action: "Report dismissed",
      performedBy: session.user.id,
      timestamp: new Date().toISOString(),
      notes: `${reason}${adminNotes ? ` | ${adminNotes}` : ""}`,
    };

    const existingReport = await prisma.report.findUnique({
      where: { id },
      select: { verificationHistory: true, reporterId: true },
    });

    if (!existingReport) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    let history: any[] = [];
    if (existingReport.verificationHistory) {
      const parsed = JSON.parse(JSON.stringify(existingReport.verificationHistory));
      if (typeof parsed === "string") {
        try {
          history = JSON.parse(parsed);
          if (!Array.isArray(history)) history = [parsed];
        } catch {
          history = [parsed];
        }
      } else if (Array.isArray(parsed)) {
        history = parsed;
      } else {
        history = [parsed];
      }
    }
    history.push(historyEntry);

    const updatedReport = await prisma.report.update({
      where: { id },
      data: {
        status: "REJECTED",
        verificationHistory: JSON.stringify(history),
      },
    });

    // Log admin action
    await prisma.adminLog.create({
      data: {
        adminId: session.user.id,
        reportId: id,
        action: `Report dismissed — ${reason}${adminNotes ? ` (${adminNotes})` : ""}`,
      },
    });

    // Create notification for the reporter
    if (updatedReport.reporterId) {
      await prisma.notification.create({
        data: {
          userId: updatedReport.reporterId,
          title: "Report Rejected",
          message: `Your report has been rejected. Reason: ${reason}`,
          type: "REPORT_STATUS_CHANGE",
          metadata: { reportId: id },
        },
      });
    }

    return NextResponse.json({ success: true, report: updatedReport });
  } catch (err: unknown) {
    console.error("[POST Dismiss Report] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
