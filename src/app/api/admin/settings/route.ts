import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { updateSettingSchema } from "@/lib/validations-admin";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      logger.warn({ ip: "unknown" }, "Unauthorized access attempt to GET /api/admin/settings");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const settings = await prisma.systemSetting.findMany();
    logger.info("Fetched system settings");
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "Error in GET /api/admin/settings");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let key: string | undefined;
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      logger.warn({ ip: "unknown" }, "Unauthorized access attempt to POST /api/admin/settings");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();

    // Validate input with zod
    const validation = updateSettingSchema.safeParse(body);
    if (!validation.success) {
      const firstError = validation.error.issues[0]?.message || "Invalid settings data";
      logger.warn({ error: firstError, body }, "Settings validation failed");
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    key = validation.data.key;
    const value = validation.data.value;

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    logger.info({ key, value }, "System setting updated");
    return NextResponse.json(setting, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage, key: key || "unknown" }, "Error in POST /api/admin/settings");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
