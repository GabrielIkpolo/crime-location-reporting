# Flutter Integration — Next.js Backend Changes

## Phase 1: Foundation (Low Risk)
- [x] Install `jose` for JWT verification
- [ ] Fix proxy.ts CORS — allow 127.0.0.1:* origins + configurable env var
- [ ] Update Prisma schema — add witnesses/suspectInfo/verificationHistory/evidence to Report model
- [ ] Run prisma db push

## Phase 2: Missing Endpoints (Medium Risk)
- [ ] Create POST /api/auth/login — returns JWT token for Flutter
- [ ] Add GET handler to /api/user/profile — return user data
- [ ] Create PUT /api/admin/reports/[id]/verify — verify a report
- [ ] Create GET /api/broadcast-alerts — public endpoint for active broadcasts

## Phase 3: Fix API Route Mismatches (Medium Risk)
- [ ] POST /api/sos/alert — accept both {latitude,longitude} and {location: GeoJSON} formats
- [ ] PUT /api/notifications/[id] — add PUT handler alongside PATCH
- [ ] Change POST /api/notifications/read-all from PATCH to POST

## Phase 4: Bearer Token Support (Medium Risk)
- [ ] Replace auth() with getAuthSession(req) in all user-facing routes
- [ ] Add Bearer support to admin routes

## Phase 5: Security Improvement
- [ ] Improve auth-helper.ts — verify JWT signatures using jose instead of jwt-decode
