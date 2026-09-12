/**
 * GET /api/email-queue/scheduler-status
 * 
 * Returns the current status of the in-app email queue scheduler.
 * Useful for monitoring and debugging.
 */

import { NextResponse } from "next/server";
import { getSchedulerStatus } from "@/lib/scheduler";

export async function GET() {
  const status = getSchedulerStatus();
  
  return NextResponse.json({
    ...status,
    timestamp: new Date().toISOString(),
  });
}
