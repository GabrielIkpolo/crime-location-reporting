# 🔧 Audit Report — Critical Fixes TODO

## Phase 1 — Critical (Priority) ✅ ALL COMPLETE

### 1. Fix middleware/auth provider mismatch ✅
- **Issue**: `auth.middleware.ts` uses `authConfig` which has a placeholder Credentials provider (returns null). Real credentials logic is in `auth.ts`. Middleware's session may not have `role` for credential logins → admin bypass risk.
- **Fix**: Merge providers — make middleware use the full auth instance from `auth.ts`

### 2. Create forgot password flow ✅
- **Issue**: `/forgot-password` page doesn't exist; login links to it. No reset flow at all.
- **Fix**: 
  - Add `PasswordResetToken` model in Prisma schema
  - Create `POST /api/auth/forgot-password` API route
  - Create `POST /api/auth/reset-password` API route  
  - Create `/forgot-password/page.tsx` page
  - Create `/reset-password/[token]/page.tsx` page

### 3. Add CSP & security headers ✅
- **Issue**: No Content-Security-Policy, no X-Content-Type-Options, X-Frame-Options, HSTS headers
- **Fix**: Create middleware that sets all required security headers on every response

### 4. Rate limit auth endpoints ✅
- **Issue**: `checkRateLimit` only applied to `/api/reports`, not login/register — brute-force possible
- **Fix**: Add rate limiting to credentials sign-in and registration

## Phase 2 — High Priority ✅ ALL COMPLETE

5. Implement profile update API (`PATCH /api/user/profile`) ✅
6. Fix sanitizeHTML with DOMPurify ✅ *(Build fix: `.sanitize()` call)*
7. Add Prisma indexes ✅ *(Already in schema: [status,createdAt], [reporterId], [riskLevel], etc.)*
8. Add API caching ✅ *(Cache-Control: s-maxage=300, stale-while-revalidate=600 on /api/reports GET)*

## Phase 3 — Medium Priority (IN PROGRESS)

### 9. Improve change password & delete account APIs
- **Issue**: Endpoints exist but need better validation, error handling, and security
- **Fix**: Add Zod validation, rate limiting, proper error messages

### 10. Add pagination to public map GET endpoint ✅ IN PROGRESS
- **Issue**: `/api/reports` fetches ALL verified + pending reports with no limit
- **Fix**: Add `skip`/`take` query params; return paginated response

### 11. Replace in-memory rate limiter with Redis/Upstash ✅ IN PROGRESS
- **Issue**: `rateLimitMap` resets on every server restart; doesn't work across multiple instances
- **Fix**: Implement Upstash Redis rate limiting for production

### 12. Add request body size limits ✅ IN PROGRESS
- **Issue**: No limit on request body size — large payloads could cause DoS
- **Fix**: Set `bodySize` in Next.js config + middleware check

## Phase 4 — Nice-to-Have (Deferred)

13. Email verification flow after registration
14. Admin dashboard charts (Recharts)
15. Bulk report actions in admin queue
16. Service worker for offline support
17. SOS backend integration (Twilio + Resend)
