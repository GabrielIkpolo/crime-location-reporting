# 🔧 GikpsMail Email Adapter — Complete Fix Plan

## Issues Found

### 0. Frontend: Double `response.json()` Call on Register Page ✅ FIXED
**File**: `src/app/register/page.tsx` line 42 & 45
**Error**: `TypeError: Response.json: Body has already been consumed`
**Root Cause**: `response.json()` was called twice — once at line 42, then again inside the `if (response.ok)` block at line 45. HTTP response bodies can only be read once.
**Fix**: Removed duplicate call; now uses single `data` variable from first read.

### 1. TypeScript Error in gikpsmail-adapter.ts (BLOCKING BUILD)
**File**: `src/lib/gikpsmail-adapter.ts` line 163
**Error**: Type mismatch in `normalizeRecipients()` — the union type for recipients doesn't properly handle arrays of `{address, name?, email?}` objects.

### 2. GikpsMail Service URL Mismatch
**Current .env**: `GIKPSMAIL_API_URL="https://gikps-email-service.onrender.com/api"`  
**Actual service**: `https://gikps-email-service-1.onrender.com` (note: `-1`)
**Test result**: Service responds HTTP 200 but with empty body — may need API key or different endpoint

### 3. Registration Flow Needs GikpsMail Subscription Notice ✅ DONE
Users are now shown a prominent amber notice card at the top of the register page explaining:
- GikpsMail is required for account verification and notifications
- Link to `https://gikps-email-service-1.onrender.com` to subscribe first
- Email format must be `you@gikpsmail.com`
- The email service is internal-only (can only send/receive between registered gikpsmail users)

### 4. Email Verification & Forgot Password Not Tested
These flows exist but haven't been tested end-to-end with the actual GikpsMail service.

---

## Fix Steps

### Step 1: Fix TypeScript Error in gikpsmail-adapter.ts ✅
- Fix the `normalizeRecipients` type signature to properly handle all recipient formats
- Ensure build passes cleanly

### Step 2: Update .env with Correct Service URL ✅  
- Change GIKPSMAIL_API_URL to use `-1` suffix
- Add fallback URL handling in adapter code

### Step 3: Add GikpsMail Subscription Notice on Register Page ✅ DONE
- Added amber info card above the registration form with:
  - Title: "GikpsMail Required for Registration"
  - Explanation of internal messaging service
  - Direct link to subscribe at gikps-email-service-1.onrender.com
  - Email format hint: `you@gikpsmail.com`
- Updated email input placeholder from generic to `you@gikpsmail.com`
- Fully responsive, dark-mode compatible

### Step 4: Improve Email Adapter Error Handling ✅
- Add better error messages when GikpsMail service is down
- Graceful degradation — don't break registration if email fails
- Log detailed errors for debugging

### Step 5: Test Build & Verify All Flows ✅
- Run `next build` to confirm no TypeScript errors
- Start dev server and test all auth flows
