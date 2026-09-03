# Sentinel NG — Next.js Admin Portal & API Backend

## Technical Documentation

**Version**: 2.0  
**Last Updated**: September 2025  
**Architecture**: Hybrid (Next.js serves as both Admin Web Portal and REST API backend)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [API Reference](#5-api-reference)
6. [Database Schema](#6-database-schema)
7. [Security Measures](#7-security-measures)
8. [CORS Configuration](#8-cors-configuration)
9. [Deployment (Render.com)](#9-deployment-rendercom)
10. [Development Guide](#10-development-guide)
11. [Monitoring & Logging](#11-monitoring--logging)

---

## 1. Overview

Sentinel NG is a comprehensive crime reporting platform designed for Nigerian communities. The system consists of two main components:

- **Mobile App (Flutter)**: Citizen-facing application for submitting crime reports, receiving alerts, and emergency SOS functionality
- **Admin Portal & API Backend (Next.js)**: Web-based admin dashboard for reviewing reports, managing users, analytics, and emergency dispatch — serving as the single backend server for both web and mobile clients

### Key Features

| Feature | Description |
|---------|-------------|
| **Crime Reporting** | Multi-step guided wizard with evidence collection (photos, video, audio) |
| **Similarity Engine** | Detects duplicate reports within configurable distance/time thresholds |
| **Community Alert Clustering** | Groups nearby pending reports into crowd alerts |
| **Data Decay** | Verified reports older than N days hidden from public view |
| **Geo-spatial Queries** | Haversine distance calculations for proximity search |
| **Emergency SOS** | Real-time emergency alert system with email notifications to contacts |
| **Admin Verification Workflow** | Multi-stage report review with risk tagging and audit logging |
| **Analytics Dashboard** | Pre-computed aggregations by type, risk level, status, temporal trends |
| **Broadcast Alerts** | Push notifications to targeted user segments |
| **Rate Limiting** | Redis-backed rate limiting for auth and report submission |

---

## 2. Tech Stack

### Backend (Next.js)

| Package | Version | Purpose |
|---------|---------|---------|
| `next` | 16.x | App Router framework |
| `react` | 19.x | UI library |
| `@auth/core` | 0.41.x | Authentication (NextAuth v5) |
| `prisma` | 6.x | ORM for MongoDB |
| `mongodb` | Native | Database driver |
| `bcryptjs` | Latest | Password hashing |
| `jose` | Latest | JWT signing/verification |
| `zod` | Latest | Schema validation |
| `@upstash/ratelimit` | Latest | Redis-backed rate limiting |
| `pino` | Latest | Structured logging |
| `axios` | Latest | HTTP client for GikpsMail integration |

### Frontend (Admin Portal)

| Package | Purpose |
|---------|---------|
| Tailwind CSS 4 | Utility-first styling |
| Recharts | Analytics charts |
| Google Maps / OpenStreetMap | Interactive crime maps |
| Lucide React | Icon system |

---

## 3. Project Structure

```
crime-location-reporting-system/
├── prisma/
│   └── schema.prisma              # Database schema (8 models + enums)
├── public/
│   ├── manifest.json              # PWA manifest
│   └── icon-*.svg                 # PWA icons
├── src/
│   ├── app/
│   │   ├── api/                   # API Routes (30+ endpoints)
│   │   │   ├── admin/             # Admin-only routes
│   │   │   │   ├── analytics/route.ts
│   │   │   │   ├── broadcast/     # Broadcast alerts CRUD
│   │   │   │   ├── dispatch/      # SOS alert management
│   │   │   │   ├── export/route.ts
│   │   │   │   ├── logs/route.ts
│   │   │   │   ├── reports/       # Report review & verification
│   │   │   │   ├── settings/route.ts
│   │   │   │   └── users/         # User management + ban/unban
│   │   │   ├── auth/              # Authentication routes
│   │   │   │   ├── [...nextauth]/route.ts  # NextAuth handler
│   │   │   │   ├── login/route.ts          # Bearer token login
│   │   │   │   ├── register/route.ts       # User registration
│   │   │   │   ├── forgot-password/route.ts
│   │   │   │   ├── reset-password/
│   │   │   │   └── verify-email/
│   │   │   ├── broadcast-alerts/route.ts    # Public broadcasts
│   │   │   ├── notifications/               # User notifications
│   │   │   ├── reports/                     # Crime reports CRUD
│   │   │   ├── sos/                         # SOS alert sending
│   │   │   ├── sos-contacts/                # Emergency contacts CRUD
│   │   │   ├── sos-alerts/route.ts          # SOS alert management (new)
│   │   │   └── user/                        # User profile/account
│   │   ├── admin/                   # Admin portal pages
│   │   │   ├── page.tsx             # Dashboard
│   │   │   ├── reports/page.tsx     # Report review list
│   │   │   ├── users/page.tsx       # User management
│   │   │   ├── logs/page.tsx        # Audit log viewer
│   │   │   └── settings/page.tsx    # System settings
│   │   ├── login/page.tsx           # Login page
│   │   ├── register/page.tsx        # Registration page
│   │   └── layout.tsx               # Root layout with SOS button
│   ├── components/                  # Reusable UI components
│   ├── lib/
│   │   ├── auth-helper.ts          # Unified auth (cookie + Bearer)
│   │   ├── prisma.ts               # Prisma client singleton
│   │   ├── gikpsmail-adapter.ts    # Email service adapter
│   │   ├── email-verification.ts   # Verification email workflows
│   │   ├── validations.ts          # Zod schemas
│   │   ├── rate-limiter.ts         # Rate limiting utilities
│   │   ├── geo-utils.ts            # Haversine distance calculations
│   │   ├── admin-logger.ts         # Admin action logging
│   │   └── logger.ts               # Pino logger setup
│   ├── types/                       # TypeScript type definitions
│   ├── auth.ts                      # NextAuth configuration
│   ├── auth.config.ts              # Auth config (providers, callbacks)
│   └── proxy.ts                     # CORS + security headers middleware
├── .env                             # Environment variables
├── next.config.ts                   # Next.js configuration
└── package.json
```

---

## 4. Authentication & Authorization

### Dual Auth Strategy

The system supports **two authentication methods** to serve both browser-based web clients and mobile apps:

#### 1. Cookie-Based Auth (Browser)

- Uses NextAuth v5 with JWT strategy
- Session stored in HTTP-only cookies
- Automatic CSRF protection
- Used by the Admin Portal web interface

#### 2. Bearer Token Auth (Flutter Mobile App)

- JWT tokens signed with `NEXTAUTH_SECRET`
- Tokens returned by `/api/auth/login` endpoint
- Decoded server-side via `jwtDecode` in auth helper
- Stored securely in Flutter's `flutter_secure_storage`

### Auth Flow Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser    │         │  Mobile App   │         │   API       │
│ (Admin Portal)│        │  (Flutter)    │         │  Backend     │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │  Cookie-based         │   Bearer Token          │
       │  auth flow            │   auth flow             │
       │                       │                        │
       ▼                       ▼                        ▼
  NextAuth session     POST /api/auth/login      getAuthSession(req)
  management           → JWT token               ↓
                       Store in secure           Decode JWT
                       storage                   → Extract user.id,
                                                 email, role
```

### Auth Helper (`src/lib/auth-helper.ts`)

The `getAuthSession()` function provides a unified way to authenticate requests:

```typescript
export async function getAuthSession(request?: NextRequest | null) {
  // Try cookie-based auth first (browser requests)
  const session = await _auth();
  if (session?.user) return session;

  // If no cookie, try Bearer token (Flutter/mobile requests)
  if (request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded && decoded.id) {
        return { user: { id: decoded.id, email: decoded.email, name: decoded.name, role: decoded.role } };
      }
    }
  }
  return null;
}
```

### Role-Based Access Control

| Role | Access Level |
|------|-------------|
| `USER` | Submit reports, view public data, manage own profile/SOS contacts |
| `ADMIN` | Full admin access: review reports, manage users, analytics, broadcasts, dispatch |

### Banned User Handling

Users can be banned by admins. When a banned user attempts to log in:

1. `/api/auth/login` returns HTTP 403 with ban reason
2. NextAuth signIn callback also detects and blocks login
3. Banned users cannot access any authenticated endpoints

---

## 5. API Reference

### Authentication Endpoints

#### `POST /api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (201):**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com" },
  "needsVerification": true
}
```

#### `POST /api/auth/login`

Authenticate and receive JWT token for mobile apps.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": { "id": "...", "name": "John Doe", "email": "john@example.com", "role": "USER" }
}
```

**Response (403) — Banned User:**
```json
{
  "error": "Account suspended",
  "isBanned": true,
  "banReason": "Your account has been suspended."
}
```

#### `POST /api/auth/forgot-password`

Request password reset email.

#### `POST /api/auth/reset-password/[token]`

Reset password with verification token.

### Reports Endpoints

#### `POST /api/reports`

Create a new crime report (authenticated users only).

**Request Body:**
```json
{
  "type": "armed_robbery",
  "description": "Armed robbery at...",
  "location": { "type": "Point", "coordinates": [3.3911, 6.5244] },
  "mediaUrls": ["https://..."],
  "isAnonymous": false,
  "witnesses": [{ "name": "...", "phone": "...", "statement": "..." }],
  "suspectInfo": { "description": "...", "vehicleInfo": "...", "numberOfSuspects": 2 },
  "evidence": [{ "type": "photo", "url": "https://...", "uploadedAt": "..." }]
}
```

**Response (201):**
```json
{
  "id": "...",
  "type": "armed_robbery",
  "status": "PENDING",
  "riskLevel": "LOW",
  ...
}
```

#### `GET /api/reports`

Fetch verified reports and community alerts (public, no auth required).

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 50 | Items per page (max: 200) |
| type | string | - | Filter by report type |
| status | string | - | Filter by status |
| riskLevel | string | - | Filter by risk level |
| nearLat | number | - | Latitude for proximity search |
| nearLng | number | - | Longitude for proximity search |
| radiusKm | number | 50 | Radius in km |

**Response:**
```json
{
  "verified": [...],
  "communityAlerts": [...],
  "pagination": { "page": 1, "limit": 50, "total": 1247, "totalPages": 25, "hasMore": true }
}
```

#### `GET /api/reports/me`

Get current user's submitted reports (authenticated).

### Admin Endpoints

#### `GET /api/admin/reports`

List all reports with filters (admin only).

**Query Parameters:** page, limit, status, riskLevel, type, search

#### `PATCH /api/admin/reports/[id]`

Update report status and/or risk level.

**Request Body:**
```json
{ "status": "VERIFIED", "riskLevel": "HIGH", "adminNotes": "Confirmed by multiple witnesses" }
```

#### `PUT /api/admin/reports/[id]/verify`

Approve a report (set status=VERIFIED).

#### `POST /api/admin/reports/[id]/dismiss`

Reject a report with reason.

**Request Body:**
```json
{ "reason": "Insufficient evidence", "adminNotes": "No photos or video provided" }
```

#### `GET /api/admin/analytics?period=daily|weekly|monthly&dateFrom=&dateTo=`

Get aggregated analytics data (admin only).

**Response:**
```json
{
  "overview": { "totalReports": 1247, "verifiedCount": 892, "pendingCount": 355 },
  "byType": [{ "type": "armed_robbery", "count": 398 }],
  "byRiskLevel": [{ "level": "HIGH", "count": 120 }],
  "byStatus": [{ "status": "VERIFIED", "count": 892 }],
  "temporalTrends": [{ "period": "2024-01-01", "count": 45 }]
}
```

#### `GET /api/admin/dispatch/active`

List all active SOS alerts (admin only).

**Response:**
```json
{
  "alerts": [
    {
      "id": "...",
      "sosAlertId": "SOS-2024-001",
      "status": "TRIGGERED",
      "reporter": { "name": "John D.", "email": "john@example.com" },
      "assignedTo": null,
      "location": { "type": "Point", "coordinates": [3.3911, 6.5244] },
      "address": "Ikeja, Lagos",
      "triggeredAt": "2024-01-15T14:30:00Z"
    }
  ]
}
```

#### `PUT /api/admin/dispatch/[id]/assign`

Assign a responder to an SOS alert.

**Request Body:**
```json
{ "responderId": "...", "notes": "Taking over this case" }
```

#### `PUT /api/admin/dispatch/[id]/status`

Update SOS alert status.

**Request Body:**
```json
{ "status": "EN_ROUTE" }  // ACKNOWLEDGED | EN_ROUTE | ON_SCENE | RESOLVED | CANCELLED
```

#### `POST /api/admin/broadcast`

Create a broadcast notification (admin only).

**Request Body:**
```json
{
  "title": "Safety Alert",
  "message": "Avoid the area around...",
  "targetAudience": "all",  // all | region | verified_users
  "priority": "HIGH",       // LOW | MEDIUM | HIGH | CRITICAL
  "regionFilter": { "type": "Point", "coordinates": [3.3911, 6.5244], "radiusKm": 5 }
}
```

#### `PATCH /api/admin/broadcast/[id]`

Toggle broadcast active/inactive status.

**Request Body:**
```json
{ "isActive": false }
```

#### `DELETE /api/admin/broadcast/[id]`

Soft delete a broadcast (sets isActive=false).

#### `GET /api/admin/users?page=1&limit=10&search=&role=`

List all users with pagination and filtering (admin only).

**Response:**
```json
{
  "users": [
    {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "emailVerified": true,
      "role": "USER",
      "isBanned": false,
      "createdAt": "...",
      "_count": { "reports": 5 }
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 15,
  "hasMore": true
}
```

#### `PUT /api/admin/users/[id]/ban`

Ban a user account.

**Request Body:**
```json
{ "reason": "Repeated false reports" }
```

#### `PUT /api/admin/users/[id]/unban`

Unban a user account.

### User Endpoints

#### `GET /api/user/profile`

Get current user's profile with related data (authenticated).

**Response:**
```json
{
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "emailVerified": true,
    "role": "USER",
    "isBanned": false,
    "_count": { "reports": 5, "sosEmergencyContacts": 3 }
  },
  "preferences": { ... }
}
```

#### `PUT /api/user/profile`

Update user profile (name only).

#### `DELETE /api/user/account`

Delete user account and associated data.

**Request Body:**
```json
{ "confirmDelete": true, "password": "userPassword" }
```

### Notifications Endpoints

#### `GET /api/notifications?page=1&limit=20&isRead=&type=`

Get notifications with pagination and filtering (authenticated).

**Query Parameters:** page, limit, isRead (true/false), type (HOTSPOT_ALERT | REPORT_STATUS_CHANGE | COMMUNITY_WARNING | SOS_RESPONSE)

#### `PATCH /api/notifications`

Mark specific or all notifications as read.

**Request Body:**
```json
{ "notificationIds": ["id1", "id2"] }  // Optional: omit to mark all as read
```

#### `GET /api/notifications/preferences`

Get notification preferences (authenticated).

#### `PUT /api/notifications/preferences`

Update notification preferences.

### SOS Endpoints

#### `POST /api/sos/alert`

Send emergency SOS email notifications to contacts.

#### `POST /api/sos-alerts`

Create a new SOS alert record (mobile app).

**Request Body:**
```json
{
  "location": { "type": "Point", "coordinates": [3.3911, 6.5244] },
  "address": "Ikeja, Lagos",
  "emergencyType": "safety"
}
```

**Response (201):**
```json
{
  "success": true,
  "sosAlertId": "SOS-2024-001",
  "alert": { ... }
}
```

#### `GET /api/sos-alerts/my`

Get current user's SOS alert history.

### SOS Contacts Endpoints

#### `GET /api/sos-contacts`

List emergency contacts (authenticated).

#### `POST /api/sos-contacts`

Add emergency contact.

**Request Body:**
```json
{ "name": "Jane Doe", "phone": "+234...", "email": "jane@example.com", "isPrimary": true }
```

#### `PATCH /api/sos-contacts/[id]`

Update emergency contact.

#### `DELETE /api/sos-contacts/[id]`

Delete emergency contact.

---

## 6. Database Schema

### Models (Prisma ORM with MongoDB)

#### User

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| name | String? | Display name |
| email | String? @unique | Email address |
| emailVerified | DateTime? | Verification timestamp |
| password | String? | Bcrypt hashed password |
| role | UserRole | USER or ADMIN |
| isBanned | Boolean | Account suspension flag |
| banReason | String? | Reason for ban |
| bannedAt | DateTime? | Ban timestamp |
| createdAt | DateTime | Account creation |

#### Report

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| type | String | Crime type |
| description | String | Incident details |
| status | ReportStatus | PENDING, VERIFIED, REJECTED, CROWD_REPORTED |
| riskLevel | RiskLevel | LOW, MEDIUM, HIGH |
| location | Json | GeoJSON Point {type, coordinates} |
| mediaUrls | String[] | Cloudinary URLs |
| isAnonymous | Boolean | Anonymous reporting flag |
| confirmationCount | Int | Similar report confirmations |
| reporterId | ObjectId? | Reporter reference |
| witnesses | Json? | Witness information array |
| suspectInfo | Json? | Suspect details object |
| verificationHistory | Json? | Admin action audit trail |
| evidence | Json? | Evidence files array |

#### SosAlert

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| sosAlertId | String @unique | Human-readable ID (SOS-2024-001) |
| reporterId | ObjectId | Reporter reference |
| status | SosAlertStatus | TRIGGERED, ACKNOWLEDGED, EN_ROUTE, ON_SCENE, RESOLVED, CANCELLED |
| location | Json | GeoJSON Point |
| address | String? | Human-readable address |
| assignedResponderId | ObjectId? | Responder assignment |
| triggeredAt | DateTime | Alert creation time |
| acknowledgedAt | DateTime? | Acknowledgment timestamp |
| enRouteAt | DateTime? | En route timestamp |
| onSceneAt | DateTime? | On scene timestamp |
| resolvedAt | DateTime? | Resolution timestamp |

#### BroadcastAlert

| Field | Type | Description |
|-------|------|-------------|
| id | ObjectId | Primary key |
| title | String | Alert title |
| message | String | Alert message |
| targetAudience | String | all, region, verified_users |
| priority | BroadcastPriority | LOW, MEDIUM, HIGH, CRITICAL |
| isActive | Boolean | Active status flag |
| regionFilter | Json? | GeoJSON filter |
| sentAt | DateTime? | Push notification timestamp |
| deliveredCount | Int | Delivery count |

### Enums

```prisma
enum UserRole { USER ADMIN }
enum ReportStatus { PENDING VERIFIED REJECTED CROWD_REPORTED }
enum RiskLevel { LOW MEDIUM HIGH }
enum SosAlertStatus { TRIGGERED ACKNOWLEDGED EN_ROUTE ON_SCENE RESOLVED CANCELLED }
enum BroadcastPriority { LOW MEDIUM HIGH CRITICAL }
enum NotificationType { HOTSPOT_ALERT REPORT_STATUS_CHANGE COMMUNITY_WARNING SOS_RESPONSE }
```

---

## 7. Security Measures

### Authentication Security

- **Password Hashing**: bcrypt with cost factor 12
- **JWT Signing**: HS256 algorithm with `NEXTAUTH_SECRET`
- **Session Expiry**: 30 days (configurable)
- **Rate Limiting**: 5 login attempts per 15 minutes per IP
- **Registration Rate Limit**: 3 registrations per 15 minutes per IP

### Request Security

| Header | Value | Purpose |
|--------|-------|---------|
| Content-Security-Policy | Strict policy | Prevent XSS attacks |
| X-Frame-Options | DENY | Prevent clickjacking |
| X-Content-Type-Options | nosniff | Prevent MIME sniffing |
| X-XSS-Protection | 1; mode=block | Legacy XSS protection |
| Referrer-Policy | strict-origin-when-cross-origin | Control referrer info |
| Permissions-Policy | Restricted features | Limit browser API access |
| Strict-Transport-Security | max-age=63072000 | Enforce HTTPS (production) |

### Body Size Limits

- Maximum request body: 1MB
- Applied to POST, PUT, PATCH requests

### Admin Protection

- All `/api/admin/*` routes require ADMIN role
- Session token validation in middleware for admin pages
- Audit logging of all admin actions

---

## 8. CORS Configuration

CORS is handled by `src/proxy.ts` (Next.js 16 proxy convention).

### Allowed Origins

```typescript
const FLUTTER_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  // Additional origins from FLUTTER_WEB_ORIGINS env var
];
```

### Dynamic Origin Matching

- Any `localhost:*` or `127.0.0.1:*` origin is automatically allowed (for Flutter hot reload)
- Production origins can be added via `FLUTTER_WEB_ORIGINS` environment variable (comma-separated)

### CORS Headers Applied

| Header | Value |
|--------|-------|
| Access-Control-Allow-Origin | Dynamic (matched origin) |
| Access-Control-Allow-Methods | GET, POST, PUT, DELETE, OPTIONS |
| Access-Control-Allow-Headers | Content-Type, Authorization |
| Access-Control-Max-Age | 86400 (24 hours) |

### Preflight Handling

OPTIONS requests to `/api/*` are handled directly in middleware with appropriate CORS headers.

---

## 9. Deployment (Render.com)

### Build Configuration

```yaml
services:
  - type: web
    name: crime-location-reporting
    env: node
    buildCommand: pnpm install && pnpm db:push && pnpm build
    startCommand: pnpm start
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: NEXTAUTH_SECRET
        generateValue: true
      - key: NEXTAUTH_URL
        fromService:
        type: web
      - key: GIKPSMAIL_API_URL
        sync: false
      - key: GIKPSMAIL_API_KEY
        sync: false
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | MongoDB connection string |
| NEXTAUTH_SECRET | Yes | JWT signing secret |
| GOOGLE_CLIENT_ID | Conditional | For Google OAuth |
| GOOGLE_CLIENT_SECRET | Conditional | For Google OAuth |
| GIKPSMAIL_API_URL | Yes | Email service URL |
| GIKPSMAIL_API_KEY | Yes | Email service API key |
| FLUTTER_WEB_ORIGINS | Optional | Production Flutter app origins |

### Build Process

1. Install dependencies: `pnpm install`
2. Push database schema: `npx prisma db push`
3. Generate Prisma Client: automatic during build
4. Build Next.js app: `pnpm build`
5. Start server: `pnpm start`

### PWA Support

The application is configured as a Progressive Web App with:
- Service worker for offline support
- Manifest.json for installability
- Runtime caching strategies (CacheFirst, NetworkFirst, StaleWhileRevalidate)

---

## 10. Development Guide

### Local Setup

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Push database schema
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Start development server
pnpm dev
```

### Running Tests

```bash
# Run linting
pnpm lint

# Type checking
tsc --noEmit
```

### Adding New API Routes

1. Create route file: `src/app/api/[category]/[endpoint]/route.ts`
2. Use `getAuthSession(req)` for authentication
3. Use `isAdmin(req)` for admin-only routes
4. Add validation with Zod schemas in `src/lib/validations.ts`
5. Log actions with `logger.info()` / `logger.error()`

### Adding New Database Models

1. Update `prisma/schema.prisma`
2. Run `npx prisma format`
3. Run `npx prisma db push`
4. Regenerate Prisma Client (automatic)

---

## 11. Monitoring & Logging

### Pino Logger Configuration

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
});
```

### Log Levels

| Level | Usage |
|-------|-------|
| error | Server errors, failed operations |
| warn | Rate limiting, validation failures |
| info | Successful operations, auth events |
| debug | Detailed request/response data |

### Admin Audit Logging

Every admin action is logged to the `AdminLog` model:

```typescript
await prisma.adminLog.create({
  data: {
    adminId: session.user.id,
    reportId: reportId, // Optional
    action: 'Report verified — Confirmed by multiple witnesses',
  },
});
```

---

## Appendix A: Error Response Format

All API errors follow a consistent format:

```json
{
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | Success | GET requests, profile updates |
| 201 | Created | POST requests (new resources) |
| 400 | Bad Request | Validation errors, missing fields |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | Forbidden | Insufficient permissions, banned user |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server errors |

---

## Appendix B: GeoJSON Format

All location data uses GeoJSON Point format:

```json
{
  "type": "Point",
  "coordinates": [longitude, latitude]
}
```

Example: Lagos coordinates → `[3.3911, 6.5244]` (lng, lat)

---

*Document generated for Sentinel NG v2.0*  
*Next.js Admin Portal & API Backend Technical Reference*
