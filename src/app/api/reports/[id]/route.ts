import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { status, riskLevel } = body;

    const updatedReport = await prisma.report.update({
      where: { id },
      data: { status, riskLevel },
    });

    return NextResponse.json(updatedReport);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
