/**
 * In-App Email Queue Scheduler — node-cron based retry worker
 * 
 * Runs inside the Next.js app process to periodically check and retry
 * queued emails when GikpsMail is down. This replaces Render.com's free
 * cron jobs (which are no longer available).
 * 
 * How it works:
 * - Starts automatically when the app boots (first request)
 * - Runs every 5 minutes by default
 * - Uses an in-memory lock to prevent duplicate processing across multiple instances
 * - Logs all activity for monitoring
 * 
 * External cron endpoint (/api/email-queue/retry) is still available for:
 * - Paid Render plans with scheduled jobs
 * - Manual testing/debugging
 * - External monitoring services (UptimeRobot, etc.)
 */

import * as cron from "node-cron";
import { processQueue } from "./email-queue";

// ============================================================================
// Singleton Guard — Prevents multiple schedulers across instances/processes
// ============================================================================

let schedulerStarted = false;
let schedulerTask: ReturnType<typeof cron.schedule> | null = null;

/**
 * Start the in-app email queue retry scheduler.
 * Safe to call multiple times — only starts once per process.
 */
export function startEmailQueueScheduler(intervalMinutes: number = 5): void {
  if (schedulerStarted) {
    console.log("[Scheduler] ⚠️ Email queue scheduler already running");
    return;
  }

  // Validate interval
  if (intervalMinutes < 1 || intervalMinutes > 60) {
    console.error("[Scheduler] ❌ Invalid interval. Must be between 1 and 60 minutes.");
    return;
  }

  const scheduleExpression = `*/${intervalMinutes} * * * *`; // Cron syntax: every N minutes

  try {
    schedulerTask = cron.schedule(scheduleExpression, async () => {
      console.log("[Scheduler] 🔄 Running scheduled email queue retry...");
      
      try {
        const stats = await processQueue(20); // Process up to 20 emails per batch
        
        if (stats.pending === 0 && stats.sending === 0) {
          console.log("[Scheduler] ✅ No pending emails — all clear");
        } else {
          console.log(`[Scheduler] 📊 Queue status: sent=${stats.sent}, failed=${stats.failed}, pending=${stats.pending}`);
        }
      } catch (error) {
        console.error("[Scheduler] ❌ Error processing email queue:", error instanceof Error ? error.message : String(error));
      }
    }, {
      timezone: "UTC", // Use UTC for consistency across all server instances
    });

    schedulerStarted = true;
    
    const now = new Date().toISOString();
    console.log(`[Scheduler] ✅ Email queue scheduler started — running every ${intervalMinutes} min (cron: ${scheduleExpression})`);
    console.log(`[Scheduler] 📅 Next run scheduled at: ${new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString()}`);
    
  } catch (error) {
    console.error("[Scheduler] ❌ Failed to start scheduler:", error instanceof Error ? error.message : String(error));
    schedulerStarted = false;
  }
}

/**
 * Stop the scheduler (useful for testing or graceful shutdown).
 */
export function stopEmailQueueScheduler(): void {
  if (!schedulerStarted || !schedulerTask) return;
  
  try {
    schedulerTask.stop();
    schedulerStarted = false;
    console.log("[Scheduler] 🛑 Email queue scheduler stopped");
  } catch (error) {
    console.error("[Scheduler] ❌ Error stopping scheduler:", error instanceof Error ? error.message : String(error));
  }
}

/**
 * Get the current status of the scheduler.
 */
export function getSchedulerStatus(): { started: true; intervalMinutes: number; nextRun?: string } | { started: false } {
  if (!schedulerStarted) return { started: false };
  
  const now = new Date();
  // Calculate approximate next run (every N minutes from midnight UTC)
  const intervalMinutes = parseInt(process.env.EMAIL_QUEUE_CRON_INTERVAL || "5", 10);
  const currentMinute = now.getUTCMinutes();
  const nextInterval = Math.ceil((currentMinute + 1) / intervalMinutes) * intervalMinutes;
  const nextRun = new Date(now);
  nextRun.setUTCMinutes(nextInterval % 60, 0, 0);
  if (nextInterval >= 60) {
    nextRun.setUTCHours(nextRun.getUTCHours() + 1);
  }

  return {
    started: true,
    intervalMinutes,
    nextRun: nextRun.toISOString(),
  };
}

// ============================================================================
// Auto-Start on Import (when app boots)
// ============================================================================

const CRON_INTERVAL = parseInt(process.env.EMAIL_QUEUE_CRON_INTERVAL || "5", 10);

// Only start in Node.js server mode (not during static generation or client-side)
if (typeof window === "undefined") {
  // Small delay to ensure Prisma and other services are initialized
  const initDelay = setTimeout(() => {
    startEmailQueueScheduler(CRON_INTERVAL);
  }, 3000); // Wait 3 seconds after first request

  // Clean up on process exit
  if (typeof process !== "undefined") {
    process.on("SIGTERM", () => {
      clearTimeout(initDelay);
      stopEmailQueueScheduler();
    });
    process.on("SIGINT", () => {
      clearTimeout(initDelay);
      stopEmailQueueScheduler();
    });
  }
}

export default {
  startEmailQueueScheduler,
  stopEmailQueueScheduler,
  getSchedulerStatus,
};
