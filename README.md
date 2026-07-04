# 🛡️ Crime Location Reporting System

A professional, real-time public safety ecosystem allowing citizens to report crimes via GPS/Maps and providing security agencies with a data-driven admin dashboard to monitor and validate hotspots.

## 🌟 Core Features

### 📱 For Citizens
- **Intelligent Reporting**: Report incidents with precise GPS coordinates, descriptions, and media evidence.
- **Anonymous Mode**: Option to submit reports without revealing identity while maintaining security audit trails.
- **Public Safety Dashboard**: An interactive map showing verified crime hotspots and real-time "Community Alerts" (crowdsourced urgency).
- **My Reports Portal**: Track the status of submitted reports from `Pending` to `Verified` or `Rejected`.
- **User Accounts**: Secure registration and login with Google OAuth support.

### 👮 For Security Agencies (Admin)
- **Verification Queue**: Review incoming reports and update status/risk levels.
- **Analytical Command Center**: High-level statistics and an analytical heatmap for hotspot detection.
- **User Management**: Manage system access and administrative roles.
- **Audit Logging**: Full transparency of all administrative actions.

## 🛠️ Technical Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Shadcn UI
- **Database**: MongoDB via Prisma ORM
- **Authentication**: NextAuth.js (Credentials & Google OAuth)
- **Mapping**: Leaflet.js & OpenStreetMap (Open Source)
- **Storage**: Hybrid (Local for Dev, Cloudinary for Prod)
- **Notifications**: Sonner (Toast Notifications)

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 18+
- MongoDB instance
- `pnpm` installed (`npm install -g pnpm`)

### Setup Steps
1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd crime-location-reporting-system
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Environment Variables**:
   Create a `.env` file in the root directory and add the following:
   ```env
   DATABASE_URL="mongodb://..."
   NEXTAUTH_SECRET="your-secret"
   GOOGLE_CLIENT_ID="your-id"
   GOOGLE_CLIENT_SECRET="your-secret"
   CLOUDINARY_CLOUD_NAME="your-name"
   CLOUDINARY_API_KEY="your-key"
   CLOUDINARY_API_SECRET="your-secret"
   ```

4. **Database Synchronization**:
   ```bash
   pnpm prisma generate
   ```

5. **Start Development Server**:
   ```bash
   pnpm dev
   ```

## 📜 Legal & Trust
- **Privacy First**: We log basic device metadata to prevent system abuse.
- **Community-Driven**: The map balances official verification with crowdsourced urgency warnings.
- **Disclaimer**: This is a tool for awareness; always contact emergency services for active crises.
