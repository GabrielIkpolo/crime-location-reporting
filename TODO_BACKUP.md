# 📋 Project TODO List

## Phase 1: Setup & Infrastructure
- [ ] Initialize Next.js project with `pnpm`.
- [ ] Setup Tailwind CSS and Shadcn UI.
- [ ] Configure MongoDB Atlas cluster and `2dsphere` indexing.
- [ ] Setup Prisma ORM and define the expanded schema.
- [ ] Implement Hybrid Storage Service (Local $\leftrightarrow$ Cloudinary).
- [ ] Setup Mapbox API keys and environment variables.
- [ ] Initialize Git and configure `.gitignore`.

## Phase 2: Authentication & Security
- [ ] Configure NextAuth.js with Google OAuth Provider.
- [ ] Implement Credentials Provider (Email/Password) with password hashing.
- [ ] Create RBAC (Role-Based Access Control) middleware for `/admin` routes.
- [ ] Setup Zod validation for API endpoints.

## Phase 3: User-Facing Features (The Safety App)
- [ ] Build the "Public Hotspot Map" (Heatmap visualization).
- [ ] Implement GPS Pinpointing logic for report submission.
- [ ] Build "Report Crime" form (including Anonymous toggle).
- [ ] Integrate media upload (via Hybrid Storage Service).
- [ ] Create "My Reports" tracking page.
- [ ] Build Emergency Contacts/Panic button section.

## Phase 4: Admin Command Center
- [ ] Build Admin Dashboard Overview (Stats and Risk charts).
- [ ] Create the Report Verification Queue (Search, Filter, Update).
- [ ] Implement Admin-only Heatmap with advanced filters (Crime type, Date).
- [ ] Build User Management and Audit Logs.

## Phase 5: API Refinement & PWA
- [ ] Audit all endpoints to ensure Flutter-app compatibility (Pure JSON REST API).
- [ ] Configure PWA manifest and service workers for mobile install.
- [ ] Optimize Mapbox marker clustering for high-density areas.
- [ ] Add fluid animations via Framer Motion.

## Phase 6: Testing & Deployment
- [ ] End-to-end flow test: Anonymous Report $\rightarrow$ Admin Verify $\rightarrow$ Public Hotspot Update.
- [ ] Test Google OAuth and Credentials login flows.
- [ ] Test Local vs Cloudinary storage switch.
- [ ] Deploy to Render.com.
- [ ] Create final API documentation for the future Flutter team.
