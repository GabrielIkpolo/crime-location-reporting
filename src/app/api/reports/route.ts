import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { reportSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/rate-limiter";
import { haversineDistance } from "@/lib/geo-utils";

export async function POST(req: NextRequest) {
  try {
    console.log("[REPORTS_API] Received POST request");
    
    // 1. Rate Limiting
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown";
    const rateLimit = checkRateLimit(ipAddress);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many reports. Please try again in an hour." }, { status: 429 });
    }

    const session = await auth();
    const body = await req.json();

    // 2. Validation
    const result = reportSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || "Invalid report data";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    const validatedData = result.data;

    // 3. Capture Device Info
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // 4. Similarity Engine (Anti-Spam & Grouping)
    const DISTANCE_THRESHOLD_KM = 0.2; // 200 meters
    const TIME_THRESHOLD = 3 * 60 * 60 * 1000; 
    const threeHoursAgo = new Date(Date.now() - TIME_THRESHOLD);

    const existingReport = await prisma.report.findFirst({
      where: {
        type: validatedData.type,
        status: "PENDING",
        createdAt: { gte: threeHoursAgo },
      },
    });

    if (existingReport) {
      const coords = (existingReport.location as any).coordinates;
      const dist = haversineDistance(
        coords[1], // lat
        coords[0], // lng
        validatedData.location.coordinates[1], // lat
        validatedData.location.coordinates[0]  // lng
      );

      if (dist < DISTANCE_THRESHOLD_KM) {
        console.log("[REPORTS_API] Similar report found. Incrementing confirmation count.");
        const updatedReport = await prisma.report.update({
          where: { id: existingReport.id },
          data: { 
            confirmationCount: { increment: 1 },
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

    // 5. Create New Report
    const report = await prisma.report.create({
      data: {
        type: validatedData.type,
        description: validatedData.description,
        location: validatedData.location,
        mediaUrls: validatedData.mediaUrls,
        isAnonymous: validatedData.isAnonymous,
        ipAddress,
        userAgent,
        reporterId: validatedData.isAnonymous ? null : (session?.user?.id || null),
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

    // 3. Spatial Clustering Logic for Pending Reports (Optimized)
    const crowdAlerts: any[] = [];
    const processedIds = new Set<string>();
    const DISTANCE_THRESHOLD_KM = 0.5; // 500 meters
    const COUNT_THRESHOLD = 5; 

    // Sort reports by latitude to allow for efficient neighbor searching
    const sortedReports = [...pendingReports].sort((a, b) => 
      (a.location as any).coordinates[1] - (b.location as any).coordinates[1]
    );

    for (let i = 0; i < sortedReports.length; i++) {
      const report = sortedReports[i];
      if (processedIds.has(report.id)) continue;

      const reportLoc = report.location as any;
      if (!reportLoc || !reportLoc.coordinates) continue;

      const currentLat = reportLoc.coordinates[1];
      const currentLng = reportLoc.coordinates[0];

      const cluster = [];
      
      // Search neighbors in sorted list (Forward)
      for (let j = i + 1; j < sortedReports.length; j++) {
        const other = sortedReports[j];
        if (processedIds.has(other.id)) continue;
        
        const otherLoc = other.location as any;
        if (!otherLoc || !otherLoc.coordinates) continue;

        // Since it's sorted by latitude, if the difference is too large, 
        // we can stop looking forward.
        // 1 degree lat ~ 111km. So 0.5km ~ 0.0045 degrees.
        const latDiff = otherLoc.coordinates[1] - currentLat;
        if (latDiff > 0.01) break; 

        const dist = haversineDistance(
          currentLat,
          currentLng,
          otherLoc.coordinates[1],
          otherLoc.coordinates[0]
        );

        if (dist < DISTANCE_THRESHOLD_KM) {
          cluster.push(other);
        }
      }

      // Include the report itself in the cluster check
      if (cluster.length + 1 >= COUNT_THRESHOLD) {
        const allInCluster = [report, ...cluster];
        const avgLng = allInCluster.reduce((sum, r) => sum + (r.location as any).coordinates[0], 0) / allInCluster.length;
        const avgLat = allInCluster.reduce((sum, r) => sum + (r.location as any).coordinates[1], 0) / allInCluster.length;
        
        crowdAlerts.push({
          id: `crowd-${Math.random().toString(36).substr(2, 9)}`,
          type: report.type,
          description: `Community Alert: ${allInCluster.length} people reported this incident.`,
          location: { type: "Point", coordinates: [avgLng, avgLat] },
          status: "CROWD_REPORTED",
          riskLevel: "MEDIUM",
          reportCount: allInCluster.length,
          createdAt: new Date(),
        });
        
        allInCluster.forEach(r => processedIds.add(r.id));
      }
    }

    return NextResponse.json({
      verified: verifiedReports,
      communityAlerts: crowdAlerts,
    });
  } catch (error: any) {
    console.error("[REPORTS_API_GET] ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
