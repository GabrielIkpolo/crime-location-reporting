/**
 * Seed script for Crime Location Reporting System
 * 
 * Populates the database with test data:
 * - Admin user (email: admin@crimereport.com / password: Admin123!)
 * - Regular users
 * - Verified, pending, and rejected reports
 * - System settings
 * - Admin logs
 * - SOS contacts
 * - Notification preferences
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Pre-computed bcrypt hash for "Admin123!" with cost 12
const ADMIN_PASSWORD_HASH = "$2b$12$LQy34ZffX4wd0lfQRH3SuOFEYO5CCijFngYav7sbG9MFRgt8rRu3e";
// Pre-computed bcrypt hash for "User123!" with cost 12
const USER_PASSWORD_HASH = "$2b$12$WApznUPhDubN0oeAig5f.veXSmXF4sIW2ZsL6gZfuPFEk8JQ6kjHm";

async function seed() {
  console.log("🌱 Starting database seed...");

  // ─── 1. Create Admin User (if not exists) ──────────────────────────────
  const adminEmail = "admin@crimereport.com";
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name: "Admin User",
        email: adminEmail,
        password: ADMIN_PASSWORD_HASH,
        role: "ADMIN",
        emailVerified: new Date(),
      },
    });
    console.log(`✅ Created admin user: ${adminEmail}`);
  } else {
    // Ensure the existing admin has correct credentials
    if (!adminUser.password || adminUser.password !== ADMIN_PASSWORD_HASH) {
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { password: ADMIN_PASSWORD_HASH, role: "ADMIN" },
      });
      console.log(`🔄 Updated admin user password: ${adminEmail}`);
    } else {
      console.log(`✅ Admin user already exists: ${adminEmail}`);
    }
  }

  // ─── 2. Create Regular Users (if not exist) ────────────────────────────
  const users = [
    { name: "John Citizen", email: "john@example.com", password: USER_PASSWORD_HASH, role: "USER" as const },
    { name: "Jane Reporter", email: "jane@example.com", password: USER_PASSWORD_HASH, role: "USER" as const },
    { name: "Mike Observer", email: "mike@example.com", password: USER_PASSWORD_HASH, role: "USER" as const },
  ];

  for (const u of users) {
    let existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      existing = await prisma.user.create({ data: u });
      console.log(`✅ Created user: ${u.email}`);
    } else {
      // Update password to known hash in case it was different
      if (existing.password !== u.password) {
        await prisma.user.update({ where: { id: existing.id }, data: { password: u.password, name: u.name, role: u.role } });
        console.log(`🔄 Updated user: ${u.email}`);
      } else {
        console.log(`✅ User already exists: ${u.email}`);
      }
    }
  }

  // ─── 3. Create Reports ─────────────────────────────────────────────────
  const reportTypes = [
    "Theft", "Robbery", "Assault", "Vandalism", "Burglary",
    "Drug Activity", "Suspicious Activity", "Traffic Incident"
  ];

  // Lagos coordinates (various locations)
  const locations = [
    { lng: 3.3792, lat: 6.5244 },   // Lagos Island
    { lng: 3.4096, lat: 6.4281 },   // Victoria Island
    { lng: 3.3515, lat: 6.6018 },   // Ikeja
    { lng: 3.3644, lat: 6.4541 },   // Surulere
    { lng: 3.2079, lat: 6.5823 },   // Yaba
    { lng: 3.3861, lat: 6.4531 },   // Apapa
    { lng: 3.4200, lat: 6.5833 },   // Lekki
    { lng: 3.3450, lat: 6.5400 },   // Mushin
    { lng: 3.3900, lat: 6.6100 },   // Agege
    { lng: 3.3600, lat: 6.4700 },   // Ogba
    { lng: 3.4500, lat: 6.4400 },   // Ikoyi
    { lng: 3.2800, lat: 6.5100 },   // Maryland
  ];

  const descriptions = [
    "Armed robbery at gunpoint near the market",
    "Pickpocketing incident reported by multiple witnesses",
    "Assault with a weapon in a dark alley",
    "Graffiti and property damage to public building",
    "Burglary at residential compound, valuables stolen",
    "Drug dealing activity observed near bus stop",
    "Suspicious person loitering near school premises",
    "Hit-and-run traffic accident, vehicle fled scene",
    "Phone snatching by motorcycle riders",
    "Break-in at commercial store during night hours",
  ];

  const statuses: ("VERIFIED" | "PENDING" | "REJECTED")[] = [
    "VERIFIED", "VERIFIED", "VERIFIED",   // More verified than pending
    "PENDING", "PENDING", "PENDING",
    "REJECTED",
  ];

  const riskLevels: ("LOW" | "MEDIUM" | "HIGH")[] = [
    "MEDIUM", "HIGH", "HIGH",
    "LOW", "MEDIUM", "HIGH",
    "LOW",
  ];

  // Get user IDs for reporter assignment
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  const regularUserIds = allUsers.filter(u => u.id !== adminUser?.id).map(u => u.id);

  const existingReports = await prisma.report.count();
  
  if (existingReports === 0) {
    console.log("📝 Creating test reports...");
    
    for (let i = 0; i < 12; i++) {
      const loc = locations[i % locations.length];
      // Stagger dates over the last 30 days
      const createdAt = new Date(Date.now() - (i * 2 * 24 * 60 * 60 * 1000));
      
      await prisma.report.create({
        data: {
          type: reportTypes[i % reportTypes.length],
          description: descriptions[i % descriptions.length],
          status: statuses[i % statuses.length],
          riskLevel: riskLevels[i % riskLevels.length],
          location: {
            type: "Point",
            coordinates: [loc.lng, loc.lat],
          },
          mediaUrls: i % 3 === 0 ? ["https://example.com/evidence1.jpg"] : [],
          isAnonymous: i % 4 === 0,
          reporterId: regularUserIds[i % regularUserIds.length] || null,
          confirmationCount: statuses[i % statuses.length] === "VERIFIED" ? Math.floor(Math.random() * 5) + 3 : 1,
          ipAddress: `197.252.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`,
          userAgent: "Mozilla/5.0 (Mobile; Android)",
          createdAt,
          updatedAt: createdAt,
        },
      });
    }
    console.log("✅ Created 12 test reports");
  } else {
    // Update existing reports to have proper statuses if all are PENDING
    const pendingCount = await prisma.report.count({ where: { status: "PENDING" } });
    const verifiedCount = await prisma.report.count({ where: { status: "VERIFIED" } });
    
    if (pendingCount > 0 && verifiedCount === 0) {
      console.log("🔄 Converting some pending reports to VERIFIED/REJECTED...");
      
      // Get first few pending reports and update them
      const pendingReports = await prisma.report.findMany({
        where: { status: "PENDING" },
        take: 5,
        orderBy: { createdAt: "asc" },
      });

      for (let i = 0; i < pendingReports.length; i++) {
        if (i < 3) {
          await prisma.report.update({
            where: { id: pendingReports[i].id },
            data: { status: "VERIFIED", riskLevel: ["MEDIUM", "HIGH", "HIGH"][i] as any, updatedAt: new Date() },
          });
        } else if (i === 4) {
          await prisma.report.update({
            where: { id: pendingReports[i].id },
            data: { status: "REJECTED", updatedAt: new Date() },
          });
        }
      }
      console.log("✅ Updated report statuses");
    } else {
      console.log(`📊 Reports already exist (${existingReports} total, ${verifiedCount} verified)`);
    }
  }

  // ─── 4. Create System Settings (if not exist) ──────────────────────────
  const settings = [
    { key: "DECAY_DAYS", value: "30" },
    { key: "DISTANCE_THRESHOLD", value: "0.5" },
    { key: "CROWD_THRESHOLD", value: "5" },
    { key: "MAX_REPORTS_PER_HOUR", value: "10" },
    { key: "SITE_NAME", value: "CrimeReport" },
    { key: "EMERGENCY_NUMBER", value: "767" },
    { key: "MAINTENANCE_MODE", value: "false" },
  ];

  for (const s of settings) {
    const existing = await prisma.systemSetting.findUnique({ where: { key: s.key } });
    if (!existing) {
      await prisma.systemSetting.create({ data: s });
      console.log(`✅ Created setting: ${s.key} = ${s.value}`);
    } else {
      console.log(`⏭️  Setting already exists: ${s.key}`);
    }
  }

  // ─── 5. Create Admin Logs ──────────────────────────────────────────────
  if (adminUser) {
    const reportCount = await prisma.report.count();
    if (reportCount > 0) {
      const firstReport = await prisma.report.findFirst({ select: { id: true } });
      
      const existingLogs = await prisma.adminLog.count();
      if (existingLogs === 0 && firstReport) {
        await prisma.adminLog.createMany({
          data: [
            {
              adminId: adminUser.id,
              reportId: firstReport.id,
              action: "Verified report",
              timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
            },
            {
              adminId: adminUser.id,
              reportId: firstReport.id,
              action: "Set risk level to HIGH",
              timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            },
            {
              adminId: adminUser.id,
              action: "Updated system settings",
              timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            },
          ],
        });
        console.log("✅ Created sample admin logs");
      }
    }
  }

  // ─── 6. Create SOS Contacts for Users ──────────────────────────────────
  if (regularUserIds.length > 0) {
    const existingContacts = await prisma.sosEmergencyContact.count();
    if (existingContacts === 0) {
      for (const userId of regularUserIds.slice(0, 2)) {
        await prisma.sosEmergencyContact.create({
          data: {
            userId,
            name: "Emergency Contact",
            phone: "+2348012345678",
            email: "contact@example.com",
            isPrimary: true,
          },
        });
      }
      console.log("✅ Created sample SOS contacts");
    }
  }

  // ─── 7. Create Notification Preferences for Users ──────────────────────
  if (regularUserIds.length > 0) {
    const existingPrefs = await prisma.notificationPreference.count();
    if (existingPrefs === 0) {
      for (const userId of regularUserIds) {
        await prisma.notificationPreference.create({
          data: {
            userId,
            hotspotAlerts: true,
            statusChanges: true,
            communityWarnings: true,
            sosResponses: true,
            emailEnabled: false,
            pushEnabled: true,
            radiusKm: 5,
          },
        });
      }
      console.log("✅ Created sample notification preferences");
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────
  const finalUserCount = await prisma.user.count();
  const finalReportCount = await prisma.report.count();
  const finalVerifiedCount = await prisma.report.count({ where: { status: "VERIFIED" } });
  const finalPendingCount = await prisma.report.count({ where: { status: "PENDING" } });
  const finalRejectedCount = await prisma.report.count({ where: { status: "REJECTED" } });

  console.log("\n📊 Seed Summary:");
  console.log(`   Users: ${finalUserCount}`);
  console.log(`   Reports: ${finalReportCount} (Verified: ${finalVerifiedCount}, Pending: ${finalPendingCount}, Rejected: ${finalRejectedCount})`);
  console.log("✅ Database seed complete!\n");

  await prisma.$disconnect();
}

seed().catch((error) => {
  console.error("❌ Seed failed:", error);
  prisma.$disconnect();
  process.exit(1);
});
