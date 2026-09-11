/**
 * POST /api/email-queue/retry
 * 
 * Retry worker — processes all pending emails in the queue.
 * 
 * This endpoint should be triggered by:
 * 1. Render.com Scheduled Jobs (cron) — every 5 minutes recommended
 *    Add to render.yaml or Render dashboard: "node -e \"fetch('https://your-domain.onrender.com/api/email-queue/retry')\""
 * 2. Manual invocation for testing
 * 
 * Authentication: Requires X-API-Key header matching EMAIL_QUEUE_API_KEY env var.
 * If no key is set, the endpoint is open (development only).
 */

import { NextRequest, NextResponse } from "next/server";
import emailQueueLib, { getQueueStats } from "@/lib/email-queue";

export async function POST(req: NextRequest) {
  try {
    // Optional API key authentication for the retry endpoint
    const apiKey = req.headers.get("x-api-key");
    const requiredKey = process.env.EMAIL_QUEUE_API_KEY;
    
    if (requiredKey && apiKey !== requiredKey) {
      return NextResponse.json(
        { error: "Unauthorized — invalid or missing API key" },
        { status: 401 }
      );
    }

    console.log("[EmailQueueWorker] 🔄 Starting queue retry batch...");
    
    const stats = await emailQueueLib.processQueue(20); // Process up to 20 emails per batch
    
    return NextResponse.json({
      message: "Queue processing complete",
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[EmailQueueWorker] ❌ Error processing queue:", error);
    return NextResponse.json(
      { error: "Failed to process email queue", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/email-queue/retry/stats
 * Returns current queue statistics.
 */
export async function GET(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    const requiredKey = process.env.EMAIL_QUEUE_API_KEY;
    
    if (requiredKey && apiKey !== requiredKey) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const stats = await getQueueStats();
    
    return NextResponse.json({
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[EmailQueueWorker] ❌ Error getting stats:", error);
    return NextResponse.json(
      { error: "Failed to get queue stats" },
      { status: 500 }
    );
  }
}
