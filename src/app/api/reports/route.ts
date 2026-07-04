import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { reportSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const body = await req.json();

    // 1. Validation
    const validatedData = reportSchema.parse(body);

    // 2. Create Report
    const report = await prisma.report.create({
      data: {
        type: validatedData.type,
        description: validatedData.description,
        location: validatedData.location,
        mediaUrls: validatedData.mediaUrls,
        isAnonymous: validatedData.isAnonymous,
        reporterId: session?.user?.id || null,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  // Only return VERIFIED reports for the public map
  try {
    const reports = await prisma.report.findMany({
      where: { status: "VERIFIED" },
    });
    return NextResponse.json(reports);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
