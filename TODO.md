# 📋 Project TODO List

## Phase 1: Setup & Infrastructure
- [x] Initialize Next.js project with `pnpm`.
- [x] Setup Tailwind CSS and Shadcn UI.
- [ ] Configure MongoDB Atlas cluster and `2dsphere` indexing.
- [x] Setup Prisma ORM and define the expanded schema.
- [x] Implement Hybrid Storage Service (Local $\leftrightarrow$ Cloudinary).
- [ ] Setup Leaflet.js and OpenStreetMap configuration.
- [x] Initialize Git and configure `.gitignore`.

## Phase 2: Authentication & Security
- [x] Configure NextAuth.js with Google OAuth Provider.
- [x] Implement Credentials Provider (Email/Password) with password hashing.
- [x] Create RBAC (Role-Based Access Control) middleware for `/admin` routes.
- [x] Setup Zod validation for API endpoints.

## Phase 3: User-Facing Features (The Safety App)
- [x] Build the "Public Hotspot Map" (Heatmap visualization).
- [x] Implement GPS Pinpointing logic for report submission.
- [x] Build "Report Crime" form (including Anonymous toggle).
- [x] Integrate media upload (via Hybrid Storage Service).
- [ ] Create "My Reports" tracking page.
- [ ] Build Emergency Contacts/Panic button section.

## Phase 4: Admin Command Center
- [x] Build Admin Dashboard Overview (Stats and Risk charts).
- [x] Create the Report Verification Queue (Search, Filter, Update).
- [x] Implement Admin-only Heatmap with advanced filters (Crime type, Date).
- [x] Build User Management and Audit Logs.

## Phase 5: API Refinement & PWA
- [x] Audit all endpoints to ensure Flutter-app compatibility (Pure JSON REST API).
- [x] Configure PWA manifest and service workers for mobile install.
- [x] Optimize map marker clustering for high-density areas.
- [x] Add fluid animations via Framer Motion.

## Phase 6: Testing & Deployment
- [ ] End-to-end flow test: Anonymous Report $\rightarrow$ Admin Verify $\rightarrow$ Public Hotspot Update.
- [ ] Test Google OAuth and Credentials login flows.
- [ ] Test Local vs Cloudinary storage switch.
- [ ] Deploy to Render.com.
- [ ] Create final API documentation for the future Flutter team.
