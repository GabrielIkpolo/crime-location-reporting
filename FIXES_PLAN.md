# Audit Fixes Plan

This document outlines the step-by-step process for addressing the issues identified in the application audit.

## Phase 1: Critical Type Safety & Security (Highest Priority)

### 1.1 Define Core TypeScript Interfaces
- Create `src/types/index.ts` to hold shared interfaces for:
    - `User` (including roles)
    - `Report` (including location and status)
    - `SystemSetting`
    - `CrimeType` (using the existing `CRIME_TYPES` constant)
- Update `src/lib/validations.ts` and `src/lib/validations-admin.ts` to export these types.

### 1.2 Fix Middleware Authentication Typing
- Update `src/middleware.ts` to use the new `User` type instead of `as any`.
- Ensure `req.auth.user` is correctly typed for role checking.

### 1.3 Remove `any` from API Routes & Server Actions
- **API Routes**:
    - `src/app/api/admin/logs/route.ts`
    - `src/app/api/admin/reports/route.ts`
    - `src/app/api/admin/settings/route.ts`
    - `src/app/api/admin/users/route.ts`
    - `src/app/api/reports/[id]/route.ts`
    - `src/app/api/reports/me/route.ts`
    - `src/app/api/reports/route.ts`
- **Server Actions**:
    - `src/app/actions/auth.ts`
    - `src/app/actions/storage.ts`
- **Error Handling**: Replace `catch (error: any)` with `catch (error: unknown)` and use type guards or `instanceof Error`.

### 1.4 Fix Database Query Typing
- Replace `(existingReport.location as any).coordinates` and similar casts with proper typing using the `Report` interface.

## Phase 2: React Best Practices & Performance

### 2.1 Fix `useEffect` Side-Effects in Map Components
- Refactor `src/components/Map/CrimeMap.tsx` to avoid calling `setState` synchronously within `useEffect`.
- Use functional updates or move state logic to appropriate places.

### 2.2 Image Optimization
- Replace all `<img />` tags with `next/image` in:
    - `src/app/report/page.tsx`
    - `src/components/admin/ReportDetailsDialog.tsx`

### 2.3 Fix JSX Unescaped Entities
- Fix unescaped characters (e.g., `"`, `'`) in:
    - `src/app/admin/settings/page.tsx`
    - `src/app/disclaimer/page.tsx`
    - `src/app/my-reports/page.tsx`

## Phase 3: Code Cleanup & Linting

### 3.1 Remove Unused Code
- Run `eslint` and systematically remove all unused variables and imports identified in the audit.

### 3.2 Final Linting Pass
- Ensure `pnpm lint` passes with zero errors and zero warnings.

---
*Plan created on: 2026-08-04*
