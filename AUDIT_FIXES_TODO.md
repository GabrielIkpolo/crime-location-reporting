# 🔧 Audit Report — Critical Fixes TODO

## Phase 1 — Critical (Priority)

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

### Phase 2 — High Priority (Deferred)
5. Implement profile update API (`PATCH /api/user/profile`) ✅
6. Fix sanitizeHTML with DOMPurify ✅ *(Build fix: `.sanitize()` call)*
7. Add Prisma indexes ✅ *(Already in schema: [status,createdAt], [reporterId], [riskLevel], etc.)*
8. Add API caching ✅ *(Cache-Control: s-maxage=300, stale-while-revalidate=600 on /api/reports GET)*
