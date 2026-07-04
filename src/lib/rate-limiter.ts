// simple in-memory rate limiter for development
// In production, this should be replaced with Redis (Upstash)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(ip: string, limit: number = 5, windowMs: number = 60 * 60 * 1000) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const newCount = record.count + 1;
  rateLimitMap.set(ip, { count: newCount, resetAt: record.resetAt });
  return { allowed: true, remaining: limit - newCount };
}
