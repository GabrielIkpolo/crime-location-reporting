import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { reportSchema } from "@/lib/validations";
import { rateLimits } from "@/lib/rate-limiter";
import { haversineDistance } from "@/lib/geo-utils";
import logger from "@/lib/logger";
import { GeoJSONPoint, CommunityAlert } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown";
    logger.info({ ip: ipAddress }, "[REPORTS_API] Received POST request");
    
    // 1. Rate Limiting — moderate limit for report submissions
    const rateLimit = await rateLimits.moderate(ipAddress);
    if (!rateLimit.allowed) {
      logger.warn({ ip: ipAddress }, "[REPORTS_API] Rate limit exceeded");
      return NextResponse.json({ error: "Too many reports. Please try again in an hour." }, { status: 429 });
    }

    const session = await auth();
    const body = await req.json();

    // 2. Validation
    const result = reportSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || "Invalid report data";
      logger.warn({ error: firstError, body }, "[REPORTS_API] Validation failed");
      return NextResponse.json({ error: firstError }, { status: 400 });
    }
    const validatedData = result.data;

    // 3. Capture Device Info
    const userAgent = req.headers.get("user-agent") || "Unknown";

    // 4. Similarity Engine (Anti-Spam & Grouping)
    // Fetch dynamic settings
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: { [key: string]: string } = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    const DISTANCE_THRESHOLD_KM = parseFloat(settingsMap.DISTANCE_THRESHOLD || "0.2"); 
    const TIME_THRESHOLD = 3 * 60 * 60 * 1000; 
    const threeHoursAgo = new Date(Date.now() - TIME_THRESHOLD);

    const existingReport = await prisma.report.findFirst({
      where: {
        type: validatedData.type,
        status: "PENDING",
        createdAt: { gte: threeHoursAgo },
      },
    });

    if (existingReport && existingReport.location) {
      const coords = existingReport.location as unknown as GeoJSONPoint;
      const dist = haversineDistance(
        coords.coordinates[1], // lat
        coords.coordinates[0], // lng
        validatedData.location.coordinates[1], // lat
        validatedData.location.coordinates[0]  // lng
      );

      if (dist < DISTANCE_THRESHOLD_KM) {
        logger.info({ reportId: existingReport.id }, "[REPORTS_API] Similar report found. Incrementing confirmation count.");
        const updatedReport = await prisma.report.update({
          where: { id: existingReport.id },
          data: { 
            confirmationCount: { increment: 1 },
            location: {
              type: "Point",
              coordinates: [
                (coords.coordinates[0] + validatedData.location.coordinates[0]) / 2,
                (coords.coordinates[1] + validatedData.location.coordinates[1]) / 2,
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

    logger.info({ reportId: report.id, type: report.type }, "[REPORTS_API] New report created");
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[REPORTS_API] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

/**
 * GET /api/reports
 * Returns verified reports and community alerts.
 *
 * Caching strategy:
 * - Verified reports: revalidate every 5 minutes (stale-while-revalidate)
 *   because verification status changes infrequently.
 * - Community alerts are computed server-side from pending reports,
 *   so they share the same cache window.
 */
export const dynamic = "force-dynamic";

/**
 * GET /api/reports?page=1&limit=50&type=&status=&riskLevel=&nearLat=&nearLng=&radiusKm=
 *
 * Query params:
 *   page      - Page number (default: 1)
 *   limit     - Items per page (default: 50, max: 200)
 *   type      - Filter by report type
 *   status    - Filter by status (VERIFIED, PENDING, REJECTED, CROWD_REPORTED)
 *   riskLevel - Filter by risk level (LOW, MEDIUM, HIGH)
 *   nearLat   - Latitude for proximity search
 *   nearLng   - Longitude for proximity search
 *   radiusKm  - Radius in km for proximity search (default: 50)
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    
    // Pagination params
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "50")), 200);
    const skip = (page - 1) * limit;

    // Filter params
    const type = url.searchParams.get("type") || undefined;
    const status = url.searchParams.get("status") || undefined;
    const riskLevel = url.searchParams.get("riskLevel") || undefined;

    // Proximity search params — default to NaN so we can detect when no location was provided
    const nearLat = url.searchParams.has("nearLat") && url.searchParams.get("nearLat") !== null ? parseFloat(url.searchParams.get("nearLat")!) : NaN;
    const nearLng = url.searchParams.has("nearLng") && url.searchParams.get("nearLng") !== null ? parseFloat(url.searchParams.get("nearLng")!) : NaN;
    const radiusKm = parseFloat(url.searchParams.get("radiusKm") || "50");

    // Fetch dynamic settings
    const settings = await prisma.systemSetting.findMany();
    const settingsMap: { [key: string]: string } = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    // Data Decay: Only show reports from the last N days for public view
    const decayDays = parseInt(settingsMap.DECAY_DAYS || "30");
    // Use Date.now() arithmetic instead of setDate() to avoid timezone/UTC conversion issues with MongoDB
    const thirtyDaysAgo = new Date(Date.now() - decayDays * 24 * 60 * 60 * 1000);

    // Build where clause for verified reports
    const verifiedWhere: any = { 
      status: "VERIFIED",
      createdAt: { gte: thirtyDaysAgo }
    };
    if (type) verifiedWhere.type = type;
    if (riskLevel) verifiedWhere.riskLevel = riskLevel;

    // Build where clause for pending reports
    const pendingWhere: any = { 
      status: "PENDING",
      createdAt: { gte: thirtyDaysAgo }
    };
    if (type) pendingWhere.type = type;
    if (riskLevel) pendingWhere.riskLevel = riskLevel;

    // 1. Fetch verified reports with pagination
    const [verifiedReports, totalVerified] = await Promise.all([
      prisma.report.findMany({
        where: verifiedWhere,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.report.count({ where: verifiedWhere }),
    ]);

    // 2. Fetch pending reports (full set for clustering — limited to recent)
    const pendingReports = await prisma.report.findMany({
      where: pendingWhere,
      orderBy: { createdAt: "desc" },
    });

    // 3. Spatial Clustering Logic for Pending Reports (Optimized)
    const crowdAlerts: CommunityAlert[] = [];
    const processedIds = new Set<string>();
    const DISTANCE_THRESHOLD_KM = parseFloat(settingsMap.DISTANCE_THRESHOLD || "0.5"); 
    const COUNT_THRESHOLD = parseInt(settingsMap.CROWD_THRESHOLD || "5"); 

    // Sort reports by latitude to allow for efficient neighbor searching
    const sortedReports = [...pendingReports].sort((a, b) => {
      const aLoc = a.location as unknown as GeoJSONPoint;
      const bLoc = b.location as unknown as GeoJSONPoint;
      return aLoc.coordinates[1] - bLoc.coordinates[1];
    });

    for (let i = 0; i < sortedReports.length; i++) {
      const report = sortedReports[i];
      if (processedIds.has(report.id)) continue;

      const reportLoc = report.location as unknown as GeoJSONPoint;
      if (!reportLoc || !reportLoc.coordinates) continue;

      const currentLat = reportLoc.coordinates[1];
      const currentLng = reportLoc.coordinates[0];

      const cluster = [];
      
      // Search neighbors in sorted list (Forward)
      for (let j = i + 1; j < sortedReports.length; j++) {
        const other = sortedReports[j];
        if (processedIds.has(other.id)) continue;
        
        const otherLoc = other.location as unknown as GeoJSONPoint;
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
        const avgLng = allInCluster.reduce((sum, r) => sum + (r.location as unknown as GeoJSONPoint).coordinates[0], 0) / allInCluster.length;
        const avgLat = allInCluster.reduce((sum, r) => sum + (r.location as unknown as GeoJSONPoint).coordinates[1], 0) / allInCluster.length;
        
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

    // 4. Apply proximity filter ONLY when actual coordinates are provided (not defaults)
    let filteredVerified = verifiedReports;
    if (!isNaN(nearLat) && !isNaN(nearLng) && nearLat !== 0 && nearLng !== 0 && radiusKm > 0) {
      filteredVerified = verifiedReports.filter((report) => {
        const loc = report.location as unknown as GeoJSONPoint;
        if (!loc || !loc.coordinates) return false;
        return haversineDistance(
          nearLat, nearLng,
          loc.coordinates[1], loc.coordinates[0]
        ) <= radiusKm;
      });
    }

    // 5. Apply status filter to crowd alerts if requested
    let filteredAlerts = crowdAlerts;
    if (status === "VERIFIED") {
      filteredAlerts = [];
    } else if (status === "PENDING" || !status) {
      // Keep all pending crowd alerts
    }

    logger.info({ 
      verifiedCount: filteredVerified.length, 
      totalVerified,
      crowdAlertsCount: filteredAlerts.length,
      page,
      limit,
    }, "[REPORTS_API] GET successful");

    // API Caching — revalidate every 5 minutes (stale-while-revalidate)
    // This prevents redundant DB queries on every page refresh.
    const response = NextResponse.json({
      verified: filteredVerified,
      communityAlerts: filteredAlerts,
      pagination: {
        page,
        limit,
        total: totalVerified,
        totalPages: Math.ceil(totalVerified / limit),
        hasMore: skip + filteredVerified.length < totalVerified,
      },
    });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=5, stale-while-revalidate=20"
    );
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[REPORTS_API_GET] ERROR");
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
