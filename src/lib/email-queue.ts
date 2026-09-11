/**
 * Email Queue — Robust retry system for GikpsMail emails.
 * 
 * When the GikpsMail service (hosted on Render.com free tier) is down,
 * emails are stored in a database queue and retried automatically via
 * the /api/email-queue/retry API endpoint.
 * 
 * The retry worker can be triggered by:
 * 1. A cron job (Render scheduled jobs — recommended)
 * 2. Manual invocation via the API endpoint
 * 3. Any incoming request that calls processQueue() directly
 * 
 * Retry strategy: exponential backoff with jitter
 * - Attempt 0 → wait 30s
 * - Attempt 1 → wait 60s  
 * - Attempt 2 → wait 2min
 * - Attempt 3 → wait 5min
 * - Attempt 4+ → wait 15min (capped)
 * 
 * After maxAttempts (default: 10), the email is marked as FAILED.
 */

import prisma from "@/lib/prisma";
import { createGikpsMailTransport } from "./gikpsmail-adapter";

// ============================================================================
// Types
// ============================================================================

export interface QueuedEmailData {
  to: string;
  from?: string;
  cc?: string;      // Comma-separated emails
  bcc?: string;     // Comma-separated emails
  subject: string;
  html?: string;
  text?: string;
}

export interface EmailQueueStats {
  pending: number;
  sending: number;
  sent: number;
  failed: number;
}

// ============================================================================
// Queue Operations
// ============================================================================

/**
 * Calculate next retry delay based on attempt count (exponential backoff + jitter).
 */
function getNextRetryDelay(attempts: number): number {
  // Base delays in milliseconds
  const baseDelays = [30_000, 60_000, 120_000, 300_000]; // 30s, 1min, 2min, 5min
  
  if (attempts < baseDelays.length) {
    const base = baseDelays[attempts];
    // Add jitter: ±20% to prevent thundering herd on retry
    const jitter = Math.floor(base * 0.2 * Math.random());
    return base + jitter;
  }
  
  // Cap at 15 minutes for later attempts
  const maxDelay = 900_000; // 15 min
  const jitter = Math.floor(maxDelay * 0.2 * Math.random());
  return maxDelay + jitter;
}

/**
 * Queue an email for sending. If GikpsMail is available, it will be sent immediately.
 * If not, it stays in the queue until the service recovers.
 */
export async function queueEmail(
  data: QueuedEmailData,
  maxAttempts: number = 10
): Promise<{ queuedId: string; wasSentImmediately: boolean }> {
  const now = new Date();
  
  // Create the queue entry first (always safe — DB is always up)
  const queueEntry = await prisma.emailQueue.create({
    data: {
      to: data.to,
      from: data.from || process.env.EMAIL_FROM_ADDRESS,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject,
      html: data.html || null,
      text: data.text || null,
      maxAttempts,
      nextRetryAt: now, // Ready to retry immediately
    },
  });

  // Try to send immediately — if it fails, the worker will pick it up later
  try {
    await sendQueuedEmail(queueEntry.id);
    return { queuedId: queueEntry.id, wasSentImmediately: true };
  } catch (error) {
    console.warn(
      `[EmailQueue] ⚠️ Immediate send failed for ${queueEntry.id}, queued for retry:`,
      error instanceof Error ? error.message : String(error)
    );
    return { queuedId: queueEntry.id, wasSentImmediately: false };
  }
}

/**
 * Send a single queued email by ID. Used by the retry worker.
 */
export async function sendQueuedEmail(queueId: string): Promise<void> {
  // Mark as SENDING to prevent duplicate processing
  await prisma.emailQueue.update({
    where: { id: queueId },
    data: {
      status: "SENDING",
      updatedAt: new Date(),
    },
  });

  const entry = await prisma.emailQueue.findUnique({ where: { id: queueId } });
  if (!entry) {
    throw new Error(`Email queue entry ${queueId} not found`);
  }

  try {
    const transporter = createGikpsMailTransport();

    const mailOptions: any = {
      to: entry.to,
      subject: entry.subject,
      text: entry.text || "",
      html: entry.html || undefined,
    };

    if (entry.from) {
      mailOptions.from = entry.from;
    }
    if (entry.cc) {
      mailOptions.cc = entry.cc.split(",").map((e: string) => e.trim()).filter(Boolean);
    }
    if (entry.bcc) {
      mailOptions.bcc = entry.bcc.split(",").map((e: string) => e.trim()).filter(Boolean);
    }

    await transporter.sendMail(mailOptions);

    // Mark as SENT
    await prisma.emailQueue.update({
      where: { id: queueId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log(`[EmailQueue] ✅ Sent queued email ${queueId} to ${entry.to}`);
  } catch (error) {
    const attempts = entry.attempts + 1;
    
    if (attempts >= entry.maxAttempts) {
      // Permanently failed
      await prisma.emailQueue.update({
        where: { id: queueId },
        data: {
          status: "FAILED",
          attempts,
          lastError: error instanceof Error ? error.message : String(error),
          updatedAt: new Date(),
        },
      });
      console.error(`[EmailQueue] ❌ Email ${queueId} permanently failed after ${attempts} attempts`);
    } else {
      // Schedule retry with exponential backoff
      const delayMs = getNextRetryDelay(attempts - 1);
      const nextRetryAt = new Date(Date.now() + delayMs);

      await prisma.emailQueue.update({
        where: { id: queueId },
        data: {
          status: "PENDING",
          attempts,
          lastError: error instanceof Error ? error.message : String(error),
          nextRetryAt,
          updatedAt: new Date(),
        },
      });

      console.warn(
        `[EmailQueue] ⏳ Email ${queueId} failed (attempt ${attempts}/${entry.maxAttempts}), retrying at ${nextRetryAt.toISOString()}`
      );
    }
  }
}

/**
 * Process all pending emails in the queue.
 * Returns stats about what was processed.
 */
export async function processQueue(batchSize: number = 20): Promise<EmailQueueStats> {
  const now = new Date();
  
  // Fetch all pending emails that are due for retry
  const pendingEmails = await prisma.emailQueue.findMany({
    where: {
      status: "PENDING",
      nextRetryAt: { lte: now },
    },
    take: batchSize,
    orderBy: { createdAt: "asc" }, // Process oldest first (FIFO)
  });

  const stats: EmailQueueStats = {
    pending: 0,
    sending: 0,
    sent: 0,
    failed: 0,
  };

  if (pendingEmails.length === 0) {
    // Count current queue state for stats
    const counts = await Promise.all([
      prisma.emailQueue.count({ where: { status: "PENDING" } }),
      prisma.emailQueue.count({ where: { status: "SENDING" } }),
      prisma.emailQueue.count({ where: { status: "SENT" } }),
      prisma.emailQueue.count({ where: { status: "FAILED" } }),
    ]);
    
    stats.pending = counts[0];
    stats.sending = counts[1];
    stats.sent = counts[2];
    stats.failed = counts[3];
    
    return stats;
  }

  // Process all pending emails in parallel (with concurrency limit)
  const results = await Promise.allSettled(
    pendingEmails.map((entry) => sendQueuedEmail(entry.id))
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      stats.sent++;
    } else {
      // The error was handled inside sendQueuedEmail (either FAILED or re-queued)
      const entry = pendingEmails.find((e) => e.id === (result as any).reason?.queueId);
      if (entry) {
        const updated = await prisma.emailQueue.findUnique({ where: { id: entry.id } });
        if (updated?.status === "FAILED") stats.failed++;
        else stats.pending++; // Still pending for next batch
      }
    }
  }

  console.log(`[EmailQueue] Processed ${pendingEmails.length} emails: sent=${stats.sent}, failed=${stats.failed}`);
  
  return stats;
}

/**
 * Get queue statistics.
 */
export async function getQueueStats(): Promise<EmailQueueStats> {
  const [pending, sending, sent, failed] = await Promise.all([
    prisma.emailQueue.count({ where: { status: "PENDING" } }),
    prisma.emailQueue.count({ where: { status: "SENDING" } }),
    prisma.emailQueue.count({ where: { status: "SENT" } }),
    prisma.emailQueue.count({ where: { status: "FAILED" } }),
  ]);

  return { pending, sending, sent, failed };
}

/**
 * Clean up old successful emails (older than retention period).
 */
export async function cleanupOldSentEmails(daysToKeep: number = 30): Promise<number> {
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
  
  const result = await prisma.emailQueue.deleteMany({
    where: {
      status: "SENT",
      sentAt: { lte: cutoffDate },
    },
  });

  console.log(`[EmailQueue] Cleaned up ${result.count} old sent emails`);
  return result.count;
}

/**
 * Retry a single failed email (manual trigger).
 */
export async function retryFailedEmail(queueId: string): Promise<{ success: boolean; error?: string }> {
  const entry = await prisma.emailQueue.findUnique({ where: { id: queueId } });
  
  if (!entry) {
    return { success: false, error: "Email queue entry not found" };
  }
  
  if (entry.status !== "FAILED") {
    return { success: false, error: `Cannot retry email with status: ${entry.status}` };
  }

  // Reset and re-queue
  await prisma.emailQueue.update({
    where: { id: queueId },
    data: {
      status: "PENDING",
      attempts: 0,
      lastError: null,
      nextRetryAt: new Date(),
    },
  });

  try {
    await sendQueuedEmail(queueId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export default {
  queueEmail,
  sendQueuedEmail,
  processQueue,
  getQueueStats,
  cleanupOldSentEmails,
  retryFailedEmail,
};
