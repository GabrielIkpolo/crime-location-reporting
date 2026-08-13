# 🔧 GikpsMail Email Adapter — Complete Fix Plan

## Issues Found

### 1. TypeScript Error in gikpsmail-adapter.ts (BLOCKING BUILD)
**File**: `src/lib/gikpsmail-adapter.ts` line 163
**Error**: Type mismatch in `normalizeRecipients()` — the union type for recipients doesn't properly handle arrays of `{address, name?, email?}` objects.

### 2. GikpsMail Service URL Mismatch
**Current .env**: `GIKPSMAIL_API_URL="https://gikps-email-service.onrender.com/api"`  
**Actual service**: `https://gikps-email-service-1.onrender.com` (note: `-1`)
**Test result**: Service responds HTTP 200 but with empty body — may need API key or different endpoint

### 3. Registration Flow Needs GikpsMail Subscription Notice
Users should be told to subscribe to gikpsmail service first before registering, since we use a custom HTTP email service (SMTP is blocked on Render).

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

### Step 3: Add GikpsMail Subscription Notice on Register Page ✅
- Show prominent banner at top of register page
- Explain that gikpsmail is required for account verification
- Link to `https://gikps-email-service-1.onrender.com` to subscribe first
- Make it visually clear but not blocking

### Step 4: Improve Email Adapter Error Handling ✅
- Add better error messages when GikpsMail service is down
- Graceful degradation — don't break registration if email fails
- Log detailed errors for debugging

### Step 5: Test Build & Verify All Flows ✅
- Run `next build` to confirm no TypeScript errors
- Start dev server and test all auth flows
