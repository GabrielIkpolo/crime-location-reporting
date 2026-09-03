import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth-helper";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import defaultTransporter from "@/lib/gikpsmail-adapter";

/**
 * POST /api/sos-alerts
 * Create a new SOS alert — used by Flutter mobile app.
 * 
 * Request Body:
 * {
 *   "location": { "type": "Point", "coordinates": [lng, lat] },
 *   "address": "Street address (optional)",
 *   "emergencyType": "medical" | "safety" | "other" // optional
 * }
 * 
 * Response:
 * { success: true, sosAlertId: "SOS-2024-001", alert: {...} }
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const body = await req.json();
    const { location, address, emergencyType } = body;

    // Validate required fields
    if (!location || !location.coordinates) {
      return NextResponse.json(
        { error: "Location is required for SOS alerts." },
        { status: 400 }
      );
    }

    // Validate GeoJSON Point format
    const coords = location.coordinates as [number, number];
    if (!Array.isArray(coords) || coords.length !== 2) {
      return NextResponse.json(
        { error: "Invalid location format. Expected [longitude, latitude]." },
        { status: 400 }
      );
    }

    // Generate unique SOS alert ID
    const count = await prisma.sosAlert.count();
    const sosAlertId = `SOS-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    // Create the SOS alert
    const alert = await prisma.sosAlert.create({
      data: {
        sosAlertId,
        reporterId: session.user.id,
        location,
        address: address || null,
        status: "TRIGGERED",
      },
      include: {
        reporter: { select: { name: true, email: true } },
      },
    });

    logger.info({ sosAlertId, userId: session.user.id }, "[SOS_ALERTS_API] New SOS alert created");

    // Send notification to emergency contacts via GikpsMail (non-blocking)
    sendEmergencyContactsNotification(alert).catch((err) => {
      logger.error({ error: err }, "[SOS_ALERTS_API] Failed to notify emergency contacts");
    });

    return NextResponse.json(
      { success: true, sosAlertId: alert.sosAlertId, alert },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[SOS_ALERTS_API] ERROR");
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sos-alerts/my
 * Get the current user's SOS alert history.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized. Please log in." }, { status: 401 });
    }

    const alerts = await prisma.sosAlert.findMany({
      where: { reporterId: session.user.id },
      orderBy: { triggeredAt: "desc" },
      take: 50,
    });

    return NextResponse.json(alerts);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: errorMessage }, "[SOS_ALERTS_API_GET] ERROR");
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

/**
 * Helper: Send email notification to user's emergency contacts.
 */
async function sendEmergencyContactsNotification(alert: any) {
  try {
    const contacts = await prisma.sosEmergencyContact.findMany({
      where: { userId: alert.reporterId },
    });

    if (contacts.length === 0) return; // No contacts to notify

    const reporterName = alert.reporter?.name || "Someone";
    const address = alert.address || "Unknown location";
    const sosAlertId = alert.sosAlertId;

    for (const contact of contacts) {
      try {
        if (!contact.email) continue; // Skip if no email
        
        await defaultTransporter.sendMail({
          to: contact.email,
          subject: `🚨 Emergency Alert: ${reporterName} needs help!`,
          html: `
            <h2>Emergency SOS Alert</h2>
            <p><strong>${reporterName}</strong> has triggered an emergency SOS alert.</p>
            <p><strong>SOS ID:</strong> ${sosAlertId}</p>
            <p><strong>Location:</strong> ${address}</p>
            <p>Please contact them immediately or assist if you are nearby.</p>
          `,
        });
      } catch (contactError) {
        logger.warn(
          { contactEmail: contact.email },
          "[SOS_ALERTS_API] Failed to notify one emergency contact"
        );
      }
    }
  } catch (error) {
    throw error; // Let the caller handle it
  }
}
