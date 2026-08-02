import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      logger.warn({ ip: "unknown" }, "Unauthorized access attempt to GET /api/admin/settings");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany();
    logger.info("Fetched system settings");
    return NextResponse.json(settings, { status: 200 });
  } catch (error: any) {
    logger.error({ error: error.message }, "Error in GET /api/admin/settings");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let key: string | undefined;
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== "ADMIN") {
      logger.warn({ ip: "unknown" }, "Unauthorized access attempt to POST /api/admin/settings");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    key = body.key;
    const value = body.value;

    if (!key || value === undefined) {
      logger.warn({ key, value }, "Invalid settings update attempt: missing key or value");
      return NextResponse.json({ error: "Key and Value are required" }, { status: 400 });
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    logger.info({ key, value }, "System setting updated");
    return NextResponse.json(setting, { status: 200 });
  } catch (error: any) {
    logger.error({ error: error.message, key: key || "unknown" }, "Error in POST /api/admin/settings");
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
