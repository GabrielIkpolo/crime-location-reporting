import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { reportSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    console.log("[REPORTS_API] Received POST request");
    const session = await auth();
    const body = await req.json();
    console.log("[REPORTS_API] Body:", JSON.stringify(body, null, 2));

    // 1. Validation
    const result = reportSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || "Invalid report data";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    const validatedData = result.data;

    // 2. Capture IP and Device Info
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // 3. Similarity Engine (Anti-Spam & Grouping)
    // Check if a similar report exists: Same type, within 100m, within 3 hours
    const DISTANCE_THRESHOLD = 0.001; // Roughly 100 meters
    const TIME_THRESHOLD = 3 * 60 * 60 * 1000; // 3 hours in ms
    const threeHoursAgo = new Date(Date.now() - TIME_THRESHOLD);

    const existingReport = await prisma.report.findFirst({
      where: {
        type: validatedData.type,
        status: "PENDING",
        createdAt: { gte: threeHoursAgo },
      },
    });

    if (existingReport) {
      // Simple distance check on existing reports (could be optimized with MongoDB $near)
      const coords = (existingReport.location as any).coordinates;
      const dist = Math.sqrt(
        Math.pow(coords[0] - validatedData.location.coordinates[0], 2) +
        Math.pow(coords[1] - validatedData.location.coordinates[1], 2)
      );

      if (dist < DISTANCE_THRESHOLD) {
        console.log("[REPORTS_API] Similar report found. Incrementing confirmation count.");
        const updatedReport = await prisma.report.update({
          where: { id: existingReport.id },
          data: { 
            confirmationCount: { increment: 1 },
            // We also update the location to the average of the two for better accuracy
            location: {
              type: "Point",
              coordinates: [
                (coords[0] + validatedData.location.coordinates[0]) / 2,
                (coords[1] + validatedData.location.coordinates[1]) / 2,
              ]
            }
          },
        });
        return NextResponse.json({ ...updatedReport, message: "Similar report detected. Confirmation added." }, { status: 200 });
      }
    }

    // 4. Create New Report
    console.log("[REPORTS_API] Creating new report in database...");
    const report = await prisma.report.create({
      data: {
        type: validatedData.type,
        description: validatedData.description,
        location: validatedData.location,
        mediaUrls: validatedData.mediaUrls,
        isAnonymous: validatedData.isAnonymous,
        ipAddress,
        userAgent,
        reporterId: session?.user?.id || null,
        confirmationCount: 1,
      },
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    console.error("[REPORTS_API] ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // Data Decay: Only show reports from the last 30 days for public view
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Fetch verified reports from last 30 days
    const verifiedReports = await prisma.report.findMany({
      where: { 
        status: "VERIFIED",
        createdAt: { gte: thirtyDaysAgo }
      },
    });

    // 2. Fetch pending reports from last 30 days for crowdsourced urgency
    const pendingReports = await prisma.report.findMany({
      where: { 
        status: "PENDING",
        createdAt: { gte: thirtyDaysAgo }
      },
    });

    // 3. Spatial Clustering Logic for Pending Reports
    const crowdAlerts: any[] = [];
    const processedIds = new Set();
    const DISTANCE_THRESHOLD = 0.002; 
    const COUNT_THRESHOLD = 5; 

    for (let i = 0; i < pendingReports.length; i++) {
      const report = pendingReports[i];
      if (processedIds.has(report.id)) continue;

      const cluster = pendingReports.filter(r => {
        if (!r.location || !report.location) return false;
        const dist = Math.sqrt(
          Math.pow((r.location as any).coordinates[0] - (report.location as any).coordinates[0], 2) +
          Math.pow((r.location as any).coordinates[1] - (report.location as any).coordinates[1], 2)
        );
        return dist < DISTANCE_THRESHOLD;
      });

      if (cluster.length >= COUNT_THRESHOLD) {
        const avgLng = cluster.reduce((sum, r) => sum + (r.location as any).coordinates[0], 0) / cluster.length;
        const avgLat = cluster.reduce((sum, r) => sum + (r.location as any).coordinates[1], 0) / cluster.length;
        
        crowdAlerts.push({
          id: `crowd-${report.id}`,
          type: cluster[0].type,
          description: `Community Alert: ${cluster.length} people reported this incident.`,
          location: { type: "Point", coordinates: [avgLng, avgLat] },
          status: "CROWD_REPORTED",
          riskLevel: "MEDIUM",
          reportCount: cluster.length,
          createdAt: new Date(),
        });
        
        cluster.forEach(r => processedIds.add(r.id));
      }
    }

    return NextResponse.json({
      verified: verifiedReports,
      communityAlerts: crowdAlerts,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
