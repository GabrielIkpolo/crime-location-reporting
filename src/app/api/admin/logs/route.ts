import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      logger.warn({ ip: "unknown" }, "Unauthorized access attempt to GET /api/admin/logs");
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const logs = await prisma.adminLog.findMany({
      orderBy: { timestamp: "desc" },
      include: { admin: true, report: true },
    });
    logger.info("Fetched admin logs");
    return NextResponse.json(logs);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "Error in GET /api/admin/logs");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
