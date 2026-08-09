/**
 * Production-ready rate limiter with Upstash Redis support.
 * 
 * Falls back to in-memory when UPSTASH_REDIS_REST_URL is not set,
 * making it work seamlessly in development while being production-ready.
 */

import { Ratelimit } from "@upstash/ratelimit";

// ─── Upstash Redis Rate Limiter (Production) ──────────────────────────────

let redisRatelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  // Lazy import to avoid errors when @upstash/ratelimit is not available
  const Redis = require("@upstash/ratelimit").Redis;
  
  redisRatelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(100, "60 s"), // Default: 100 requests per minute
    analytics: true,
    prefix: "@crimereport/ratelimit",
  });
}

// ─── In-Memory Fallback (Development) ─────────────────────────────────────

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimitMemory(
  key: string,
  limit: number = 100,
  windowMs: number = 60 * 60 * 1000
) {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const newCount = record.count + 1;
  rateLimitMap.set(key, { count: newCount, resetAt: record.resetAt });
  return { allowed: true, remaining: limit - newCount };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Check rate limit for a given key.
 * 
 * @param key - Unique identifier (IP address, user ID, etc.)
 * @param options - Rate limiting configuration
 * @returns Object with `allowed` boolean and `remaining` count
 */
export async function checkRateLimit(
  key: string,
  options?: {
    limit?: number;
    windowMs?: number;
    maxBurst?: number; // For sliding window (Upstash)
  }
): Promise<{ allowed: boolean; remaining: number; resetAt?: number }> {
  const { limit = 100, windowMs = 60 * 60 * 1000, maxBurst = 100 } = options || {};

  // Use Upstash Redis if available (production)
  if (redisRatelimit) {
    try {
      const result = await redisRatelimit.limit(key, { rate: maxBurst });

      return {
        allowed: result.success,
        remaining: Math.max(0, result.remaining - 1),
        resetAt: Date.now() + (result.reset - Date.now()),
      };
    } catch (error) {
      console.warn("[RateLimiter] Upstash failed, falling back to in-memory:", error);
      // Fall through to in-memory below
    }
  }

  // In-memory fallback (development)
  const result = checkRateLimitMemory(key, limit, windowMs);
  return {
    ...result,
    resetAt: Date.now() + windowMs,
  };
}

/**
 * Rate limiter configuration presets for common use cases.
 */
export const rateLimits = {
  /** Strict: 5 requests per 15 minutes — for sensitive operations */
  strict: (key: string) => checkRateLimit(key, { limit: 5, windowMs: 15 * 60 * 1000, maxBurst: 5 }),

  /** Moderate: 20 requests per hour — for API mutations */
  moderate: (key: string) => checkRateLimit(key, { limit: 20, windowMs: 60 * 60 * 1000, maxBurst: 20 }),

  /** Standard: 100 requests per hour — for general API access */
  standard: (key: string) => checkRateLimit(key, { limit: 100, windowMs: 60 * 60 * 1000, maxBurst: 100 }),

  /** Auth login: 5 attempts per 15 minutes — prevents brute force */
  authLogin: (key: string) => checkRateLimit(key, { limit: 5, windowMs: 15 * 60 * 1000, maxBurst: 5 }),

  /** Registration: 3 attempts per 15 minutes — prevents spam accounts */
  registration: (key: string) => checkRateLimit(key, { limit: 3, windowMs: 15 * 60 * 1000, maxBurst: 3 }),

  /** Password reset: 3 attempts per hour — prevents abuse */
  passwordReset: (key: string) => checkRateLimit(key, { limit: 3, windowMs: 60 * 60 * 1000, maxBurst: 3 }),

  /** SOS alerts: 2 requests per minute — prevent spam emergencies */
  sosAlert: (key: string) => checkRateLimit(key, { limit: 2, windowMs: 60 * 1000, maxBurst: 2 }),
} as const;

/**
 * Get the current rate limiter mode for logging.
 */
export function getRateLimiterMode(): "redis" | "memory" {
  return redisRatelimit ? "redis" : "memory";
}
