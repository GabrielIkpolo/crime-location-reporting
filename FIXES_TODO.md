# 🔧 Bug Fixes — Three Issues from Last Session

## Issue 1: Admin page redirects to login (Middleware cookie mismatch)
- **Root Cause**: Middleware checks for `__Secure-next-auth.session-token` or `next-auth.session.token`, but NextAuth v5 sets `__Host-next-auth.session.token` by default. Cookie name mismatch → always fails auth check → redirect to /login.
- **Fix**: Update middleware cookie detection to include the correct NextAuth v5 cookie names.

## Issue 2: eval() is not supported in this environment (CSP + Turbopack)
- **Root Cause**: The CSP `script-src` header added in last session doesn't include `'unsafe-eval'`. Turbopack (Next.js dev server) requires `eval()` for hot reloading, source maps, and dynamic imports. React dev mode also uses eval for callstack reconstruction.
- **Fix**: Add `'unsafe-eval'` to script-src when NODE_ENV is development.

## Issue 3: Safety view data not showing (No verified reports in DB)
- **Root Cause**: Database has zero VERIFIED reports and zero system settings. The `/api/reports` GET endpoint filters by `createdAt >= thirtyDaysAgo`, so with no data, the sidebar shows nothing.
- **Fix**: Seed test data including verified reports and system settings.
