# 🔧 Bug Fixes — Three Issues from Last Session

## Issue 1: Admin page redirects to login (Middleware cookie mismatch) 🔄 IN PROGRESS
- **Root Cause**: `req.cookies.keys()` doesn't exist on Next.js RequestCookies type → compilation error. Even if it compiled, the cookie detection logic needs verification.
- **Fix**: Replace with proper cookie iteration API; verify cookie names match what NextAuth v5 beta.31 actually sets.

## Issue 2: eval() is not supported in this environment (CSP + Turbopack) ✅ COMPLETE
- Already fixed — `'unsafe-eval'` added to script-src for development.

## Issue 3: Safety view data not showing (No verified reports in DB) ✅ COMPLETE
- Already seeded test data.
