# 🔍 CrimeReport — Full Application Audit Report

**Date**: 2025-07-31  
**Tech Stack**: Next.js 16, React 19, Prisma + MongoDB, NextAuth v5 (beta), Leaflet, Tailwind CSS 4, Shadcn UI  
**Scope**: Complete codebase review — all pages, API routes, auth config, middleware, components, lib files

---

## 🚧 1. Unimplemented / Incomplete Features

### Critical Missing Features
| # | Feature | Status | Details | Fix Required |
|---|---------|--------|---------|--------------|
| 1 | **Forgot Password** | ❌ Broken link | `/forgot-password` page doesn't exist — login page links to it | Create `src/app/forgot-password/page.tsx` + `POST /api/auth/forgot-password` route |
| 2 | **Profile Update API** | ⚠️ Frontend only | Settings → Profile tab has a form but `handleUpdateProfile` just does `setTimeout(1000)` — no actual API call to update user data | Create `PATCH /api/user/profile` endpoint; wire up frontend |
| 3 | **Change Password** | ❌ Placeholder | Security tab shows "Change Password" button with no handler or backend endpoint | Create `PUT /api/user/change-password` + wire up UI |
| 4 | **Delete Account** | ❌ Placeholder | Settings → Security has a "Delete Account" button with no implementation | Create `DELETE /api/user/account` + wire up UI |
| 5 | **2FA (Two-Factor Auth)** | ⚠️ Marked "Coming Soon" | No implementation, no API route, no UI logic beyond the badge | Plan for future; not critical now |
| 6 | **Real-time Notifications** | ⚠️ Polling only | Uses `setInterval(fetchNotifications, 30000)` — no WebSocket/SSE push. Notifications are never actually created (no code triggers notification creation when reports change) | Add server-side trigger for notifications on report status changes; consider SSE or WebSockets later |
| 7 | **SOS SMS/Email Delivery** | ⚠️ Client-side only | SOS uses `window.open('sms:...')` and `window.open('mailto:...')` — not a real alert system. No backend sends actual SMS/email to contacts | Integrate Twilio (SMS) + Resend/SendGrid (email); create `POST /api/sos/alert` endpoint |

### Missing Pages / Endpoints
| # | Feature | Details | Fix Required |
|---|---------|---------|--------------|
| 8 | **Forgot Password Page** | `/forgot-password` route missing entirely | Create page + email reset flow |
| 9 | **Reset Password Page** | No password reset flow at all (no `POST /api/auth/forgot-password`) | Create `src/app/reset-password/[token]/page.tsx` + verification token model in Prisma |
| 10 | **Email Verification** | No resend verification email endpoint; `emailVerified` field exists but no flow to trigger it | Add `POST /api/auth/verify-email` and trigger on registration |
| 11 | **User Profile Edit API** | No `PATCH /api/user/profile` — profile changes are simulated with a fake timeout | Create endpoint using Prisma `update` |
| 12 | **Account Deletion API** | No `DELETE /api/user/account` endpoint | Create endpoint that cascades deletes or soft-deletes user data |
| 13 | **Password Change API** | No `PUT /api/user/change-password` endpoint | Create endpoint with old password verification + bcrypt rehash |
| 14 | **SOS Backend Service** | No server-side SMS/email integration (Twilio, SendGrid, etc.) — SOS is purely client-side `window.open()` hacks | Integrate Twilio API for SMS; Resend/SendGrid for email |

### Missing Admin Features
| # | Feature | Details | Fix Required |
|---|---------|---------|--------------|
| 15 | **Bulk Report Actions** | No bulk approve/reject in admin reports queue | Add checkbox selection + `PATCH /api/admin/reports/bulk` endpoint |
| 16 | **Export Reports** | No CSV/PDF export for reports or audit logs | Add `GET /api/admin/export?format=csv` with streaming response |
| 17 | **Admin Dashboard Charts** | Stats cards show static numbers — no charts/graphs (Chart.js, Recharts) | Install `recharts`; add line/bar charts for report trends over time |

---

## ⚡ 2. Performance Optimizations

### High Priority
| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | **No API caching** | Every page refresh re-fetches all reports from MongoDB | Add `staleTime` / SWR or React Query for report data. Use Next.js `fetch` cache: `fetch(url, { next: { revalidate: 60 } })` |
| 2 | **Full report fetch on admin dashboard** | `/api/admin/reports` returns ALL reports (no filtering by MongoDB) before client-side filtering | Add query params: `?status=PENDING&riskLevel=HIGH` and filter server-side in Prisma with `where` clause |
| 3 | **No pagination on public map GET** | `/api/reports` fetches ALL verified + pending reports with no limit | Add `skip`/`take` to Prisma query; return paginated response. Public map only needs recent reports (last 30 days) |
| 4 | **In-memory rate limiter** | `rateLimitMap` resets on every server restart; doesn't work across multiple server instances (Vercel) | Replace with Upstash Redis rate limiting for production |
| 5 | **No image optimization** | Media URLs from Cloudinary are loaded as-is without Next.js `<Image>` | Use `<Image>` component or add `?w=800` to Cloudinary URLs for on-the-fly resizing |

### Medium Priority
| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 6 | **No Prisma indexes** | MongoDB queries on `status`, `createdAt`, `reporterId` are unindexed | Add `@@index([status, createdAt])`, `@@index([reporterId])`, `@@index([userId])` in schema.prisma |
| 7 | **Full object serialization** | Admin users API returns full user objects (already partially fixed with `select`) | Verify no sensitive fields leak via Prisma; audit all `findMany` calls for unnecessary field selection |
| 8 | **No lazy loading for admin pages** | All admin components load at once | Already uses dynamic imports for maps, but add code splitting for heavy tables |
| 9 | **Notification polling every 30s** | Unnecessary API calls when user is inactive | Use `document.visibilityState` to pause polling when tab is hidden; increase interval to 60s |
| 10 | **No CDN / edge cache** | Static assets served directly from Next.js | Configure Vercel/CDN cache for public assets, fonts, and API responses |

### Low Priority (Nice-to-Have)
| # | Issue | Recommendation |
|---|-------|---------------|
| 11 | **No service worker** | Add `next-pwa` for offline support and faster repeat visits |
| 12 | **No virtualized lists** | If reports grow to 1000+, use `react-window` or `@tanstack/virtual` for long lists |
| 13 | **Bundle size** | Framer Motion + Leaflet + MarkerCluster is heavy — tree-shake unused framer-motion components |

---

## 🔐 3. OAuth Security Audit

### ✅ What's Done Well
- Uses **NextAuth v5 (beta)** with JWT strategy — good choice for stateless auth
- Google OAuth properly configured via environment variables (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- Credentials provider uses `bcrypt` with cost factor **12** (strong)
- Session max age set to **30 days** with proper expiry handling
- Session limit of **3 concurrent sessions per user** implemented in callbacks
- Middleware protects `/admin` routes with role-based access control

### ⚠️ Issues Found

| # | Severity | Issue | Details | Fix Required |
|---|----------|-------|---------|--------------|
| 1 | 🔴 **HIGH** | **Credentials provider not in middleware auth instance** | `auth.middleware.ts` creates a NextAuth instance that only has Google + placeholder Credentials. The real credentials logic is in `auth.ts`. This means the middleware's `session` object may not have `role` populated for credential logins, potentially bypassing admin route protection | Merge providers into one config or ensure middleware uses the full auth instance from `auth.ts` (remove separate middleware instance) |
| 2 | 🔴 **HIGH** | **No CSRF protection on credentials login** | Credentials sign-in via `signIn("credentials", { redirect: false })` doesn't include a CSRF token. NextAuth v5 handles this differently, but there's no explicit anti-CSRF measure on the login form | Add a hidden CSRF token field or use NextAuth's built-in CSRF protection (verify it's enabled in config) |
| 3 | 🟡 **MEDIUM** | **No rate limiting on login/register** | The `checkRateLimit` is only applied to `/api/reports`, not to `/login` or registration. Brute-force password attacks are possible | Add rate limiting to auth endpoints (e.g., 5 attempts per 15 minutes) — create a shared rate limiter utility |
| 4 | 🟡 **MEDIUM** | **Session token stored in JWT without signing key rotation** | `process.env.NEXTAUTH_SECRET` must be set — if it's missing or weak, tokens can be forged | Verify `NEXTAUTH_SECRET` is a strong random string (32+ chars) in production; add env var validation on startup |
| 5 | 🟢 **LOW** | **No HTTP-only cookie for session token** | NextAuth v5 with JWT strategy stores the session in an HTTP-only cookie by default — this is correct. But verify `cookies` config isn't overridden to use localStorage | Check that no custom cookie config disables httpOnly; add explicit `cookies: { sessionToken: { options: { httpOnly: true, secure: true } } }` if needed |
| 6 | 🟢 **LOW** | **No SameSite / Secure cookie flags explicitly set** | NextAuth sets these automatically, but in development with HTTP (not HTTPS), the `secure` flag is disabled. Ensure production always uses HTTPS | Add `NEXTAUTH_URL=https://yourdomain.com` in production env; verify no localhost overrides |

### OAuth Flow Verification Checklist
```
✅ Google provider configured with client ID/secret from env vars
✅ Credentials provider properly hashes passwords with bcrypt (cost 12)
✅ JWT callbacks correctly attach role, name, email to token
✅ Session callbacks correctly map token → session.user
✅ Middleware checks auth + admin role for /admin routes
⚠️  Credentials authorize() returns null on failure (good — prevents email enumeration)
❌  No email verification flow after registration
❌  No password reset flow (forgot password → reset link → new password)
```

---

## 🛡️ 4. General Security Audit

### 🔴 Critical Issues

| # | Issue | Details | Fix Required |
|---|-------|---------|--------------|
| 1 | **No Content-Security-Policy (CSP)** | No CSP headers set — vulnerable to XSS attacks, especially with `innerHTML` in Leaflet popups | Add CSP middleware header: `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: https://res.cloudinary.com https://*.tile.openstreetmap.org` |
| 2 | **No Helmet / security headers** | Missing `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Strict-Transport-Security` | Add a middleware that sets these headers on every response |
| 3 | **IP address logged in plain text** | `ipAddress` stored in Report model — combined with no rate limiting on login, this could be used for targeted attacks | Already partially mitigated by rate limiter on reports. Extend to auth endpoints |

### 🟡 Medium Issues

| # | Issue | Details | Fix Required |
|---|-------|---------|--------------|
| 4 | **`sanitizeHTML` only escapes HTML entities** | The `sanitizeHTML` function in `utils-security.ts` does basic entity escaping but doesn't prevent SVG/iframe injection via the `html` attribute or event handlers like `onclick`. Leaflet popups use `bindPopup()` with raw HTML strings | Use DOMPurify library instead of custom sanitizer for popup content |
| 5 | **No input length limits on admin endpoints** | Admin settings API accepts any string value without max length validation beyond 50 chars for key. The value field has no limit | Add `max(100)` or similar to setting values; validate numeric strings before parsing |
| 6 | **`confirm()` used in browser code** | `deleteUser` uses native `confirm()` dialog — can be bypassed by disabling JS or using DevTools | Move confirmation logic to server-side (already partially done with userId validation) |
| 7 | **No request body size limits** | No `body-parser` or Next.js config limit on request body size. Large payloads could cause DoS | Set `bodySize: '1mb'` in Next.js config or use middleware to reject oversized requests |
| 8 | **Cloudinary credentials exposed in client-side code path** | While Cloudinary is called from a server action (`"use server"`), the import and config are at module level. If someone imports `storage.ts` directly, they could access the config | Ensure `uploadMediaAction` is only callable via server actions; add runtime check that it's running on server side |

### 🟢 Low Issues / Best Practices

| # | Issue | Recommendation |
|---|-------|---------------|
| 9 | **No audit log for user registration** | When a new user registers, no `AdminLog` entry is created | Add logging in `registerUserAction` |
| 10 | **Error messages leak internal details** | Some error responses include raw Prisma/DB error messages | Wrap all DB errors with generic messages; log detailed errors server-side only |
| 11 | **No request ID / tracing** | Hard to trace requests in production logs | Add a unique `requestId` header and include it in all log entries |
| 12 | **MongoDB connection string in env without SSL** | If `DATABASE_URL` doesn't include `?sslmode=require`, connections are unencrypted | Ensure MongoDB Atlas uses TLS/SSL for all connections |

---

## 📊 Summary Scorecard

| Category | Score | Notes |
|----------|-------|-------|
| **Unimplemented Features** | 17 / 20 incomplete | Core auth flow (forgot password, profile update) and SOS backend are the biggest gaps |
| **Performance** | 6/10 | Works fine for small data; needs caching, indexing, and pagination for scale |
| **OAuth Security** | 7/10 | Solid foundation but middleware/provider mismatch is a real risk |
| **General Security** | 6/10 | Good input validation with Zod, but missing CSP, security headers, and proper HTML sanitization |

---

## 🎯 Recommended Fix Priority (Next Session)

### Phase 1 — Critical (Do First)
1. **Fix middleware/auth provider mismatch** — Merge providers so admin role is always available in session
2. **Create forgot password flow** — `page.tsx` + API route + email verification token model
3. **Add CSP & security headers** — Middleware to set all required headers
4. **Rate limit auth endpoints** — Extend rate limiter to login/register

### Phase 2 — High Priority
5. **Implement profile update API** — Wire up frontend form to real `PATCH /api/user/profile`
6. **Fix sanitizeHTML with DOMPurify** — Replace custom sanitizer in Leaflet popups
7. **Add Prisma indexes** — Improve query performance on MongoDB
8. **Add API caching** — Use Next.js fetch cache or SWR for report data

### Phase 3 — Medium Priority
9. **Implement change password & delete account APIs**
10. **Add pagination to public map GET endpoint**
11. **Replace in-memory rate limiter with Redis/Upstash**
12. **Add request body size limits**

### Phase 4 — Nice-to-Have
13. **SOS backend integration (Twilio + Resend)**
14. **Admin dashboard charts (Recharts)**
15. **Bulk report actions in admin queue**
16. **Service worker for offline support**

---

## 📁 Key Files Referenced

| File | Purpose |
|------|---------|
| `src/auth.ts` | Main NextAuth config with credentials provider |
| `src/auth.config.ts` | Shared auth configuration (providers, callbacks) |
| `src/auth.middleware.ts` | Middleware-only auth instance (⚠️ incomplete providers) |
| `src/middleware.ts` | Route protection middleware for /admin |
| `src/app/api/reports/route.ts` | Public reports GET/POST endpoints |
| `src/app/api/admin/*` | Admin API routes (reports, users, logs, settings) |
| `src/app/actions/auth.ts` | Server action for user registration |
| `src/app/actions/storage.ts` | Server action for media upload (Cloudinary/local) |
| `src/lib/rate-limiter.ts` | In-memory rate limiter (⚠️ not production-ready) |
| `src/lib/utils-security.ts` | Custom HTML sanitizer (⚠️ incomplete) |
| `src/lib/validations.ts` | Zod schemas for user/report validation |
| `prisma/schema.prisma` | Database schema with all models |

---

*Generated by AI audit agent — 2025-07-31*
