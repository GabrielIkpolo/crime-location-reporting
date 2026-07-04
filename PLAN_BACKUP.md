# 🛡️ Crime Location Reporting System - Technical Plan

## 1. Project Overview
A real-time, mobile-first public safety ecosystem allowing citizens to report crimes and view crime-prone hotspots to avoid dangerous areas. The system provides security agencies with a data-driven command center to validate reports and optimize responses.

## 2. Core Objectives
- **Citizen Safety:** Publicly accessible hotspot maps for crime avoidance.
- **Real-time Reporting:** GPS-pinpointed reporting with media evidence.
- **Omni-Channel Access:** Web PWA today, native Android/iOS (Flutter) tomorrow.
- **Admin Governance:** Secure portal for report verification and risk analysis.

## 3. Technical Stack
- **Framework:** Next.js 14+ (App Router) - Acting as both Frontend and API Gateway.
- **Language:** TypeScript.
- **Styling:** Tailwind CSS + Shadcn UI.
- **Database:** MongoDB Atlas (via Prisma ORM).
- **Authentication:** NextAuth.js (Google OAuth + Credentials Provider).
- **Media Storage:** 
  - *Development:* Local File System.
  - *Production:* Cloudinary.
- **Mapping:** Mapbox GL JS (Heatmaps, Clusters, and GPS Pinpointing).
- **Deployment:** Render.com.
- **Package Manager:** `pnpm`.

## 4. Architecture Design

### 4.1 Data Model (Prisma/MongoDB)
**User Model:**
- `id`, `email`, `password` (hashed), `name`, `image` (Google profile pic), `role` (USER, ADMIN), `createdAt`

**Report Model:**
- `id`, `type` (Theft, Robbery, etc.), `description`, `status` (PENDING, VERIFIED, REJECTED), `riskLevel` (LOW, MEDIUM, HIGH)
- `location`: `{ type: "Point", coordinates: [longitude, latitude] }` (GeoJSON)
- `mediaUrls`: Array of strings.
- `isAnonymous`: Boolean.
- `reporterId`: Relation to User (null if anonymous).
- `createdAt`, `updatedAt`

**AdminLog Model:**
- `id`, `adminId`, `reportId`, `action`, `timestamp`

### 4.2 API Strategy (Decoupled for Flutter Integration)
To support a future Flutter app, all logic will reside in `/api` routes rather than just Server Actions.
- `POST /api/auth/...`: NextAuth handlers.
- `POST /api/reports`: Submit report (handles GPS data & media).
- `GET /api/reports/public`: Fetch verified reports for the Public Hotspot Map.
- `GET /api/reports/admin`: Full access for admin dashboard.
- `PATCH /api/admin/reports/[id]`: Verification and risk tagging.

### 4.3 UI/UX Modules
**User Interface:**
- **Public Safety Map:** Interactive map with heatmaps showing crime density (Hotspots).
- **Reporting Suite:** GPS-enabled pinpointing, media upload, and anonymous toggle.
- **My Reports:** Track the status of submitted reports.
- **Emergency Hub:** Quick-access panic buttons and local security contacts.

**Admin Interface:**
- **Command Center:** Real-time stats and risk-level distribution.
- **Verification Queue:** Manage pending reports with one-click approval.
- **Analytical Heatmap:** Deep-dive into crime clusters.

## 5. Specialized Logic
- **Hybrid Storage Wrapper:** A storage service class that checks `process.env.NODE_ENV`. If `development`, save to `/public/uploads`; if `production`, upload to Cloudinary.
- **GPS Pinpointing:** Use `navigator.geolocation` to capture exact coordinates, with a fallback to a manual map-picker.
- **PWA:** Implement manifest and service workers for "Add to Home Screen" and offline cached maps.

## 6. Security & Scalability
- **Auth:** JWT-based sessions for API security.
- **Validation:** Zod for all incoming API payloads.
- **Performance:** MongoDB Geospatial Indexing (`2dsphere`) for lightning-fast proximity queries.
