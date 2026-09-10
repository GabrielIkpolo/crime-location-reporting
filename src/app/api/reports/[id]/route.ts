import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-helper";
import { updateReportSchema } from "@/lib/validations-admin";

/**
 * GET /api/reports/[id]
 * Access rules (non-breaking — admin behavior unchanged):
 * - Admin: can view any report.
 * - Report owner: can view their own reports (any status) — used by the Flutter app's
 *   "My Reports" detail/timeline screens.
 * - Everyone else (incl. anonymous): only VERIFIED / CROWD_REPORTED reports are visible,
 *   matching what GET /api/reports already exposes publicly on the map.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);

  try {
    const { id } = await params;
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    const isAdmin = session?.user?.role === "ADMIN";
    const isOwner = !!session?.user?.id && report.reporterId === session.user.id;
    const isPubliclyVisible = report.status === "VERIFIED" || report.status === "CROWD_REPORTED";

    if (!isAdmin && !isOwner && !isPubliclyVisible) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json(report);
  } catch (err: unknown) {
    console.error("[GET Report] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession(req);
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();

    // Validate Enum values using the new schema
    const validation = updateReportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ error: "Invalid status or risk level provided" }, { status: 400 });
    }

    const { status, riskLevel } = validation.data;

    const updatedReport = await prisma.report.update({
      where: { id },
      data: { 
        status, 
        riskLevel 
      },
    });

    return NextResponse.json(updatedReport);
  } catch (err: unknown) {
    console.error("[PATCH Report] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
