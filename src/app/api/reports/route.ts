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
    console.log("[REPORTS_API] Session User ID:", session?.user?.id);

    // 1. Validation
    const result = reportSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || "Invalid report data";
      console.log("[REPORTS_API] Validation failed:", firstError);
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    const validatedData = result.data;

    // 2. Capture IP and Device Info
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // 3. Create Report
    console.log("[REPORTS_API] Creating report in database...");
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
      },
    });

    console.log("[REPORTS_API] Report created successfully: ", report.id);
    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    console.error("[REPORTS_API] ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch all verified reports
    const verifiedReports = await prisma.report.findMany({
      where: { status: "VERIFIED" },
    });

    // 2. Fetch all pending reports to analyze crowdsourced urgency
    const pendingReports = await prisma.report.findMany({
      where: { status: "PENDING" },
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
