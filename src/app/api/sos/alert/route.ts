import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth-helper";

/**
 * POST /api/sos/alert
 * Sends emergency SOS alerts to all contacts via email (GikpsMail).
 * Also creates a SosAlert record in the database for admin dispatch tracking.
 * 
 * Accepts two location formats:
 * 1. { latitude, longitude } — flat numbers (existing web format)
 * 2. { location: { type: "Point", coordinates: [lng, lat] } } — GeoJSON (Flutter format)
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user (supports both cookie and Bearer token)
    const session = await getAuthSession(req);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Extract location — support both flat numbers and GeoJSON format
    let latitude: number;
    let longitude: number;

    if (body.location && typeof body.location === "object") {
      // Flutter sends GeoJSON: { type: "Point", coordinates: [lng, lat] }
      const coords = body.location.coordinates as [number, number];
      if (!coords || coords.length !== 2) {
        return NextResponse.json(
          { error: "Valid location with coordinates is required." },
          { status: 400 }
        );
      }
      longitude = coords[0];
      latitude = coords[1];
    } else if (body.latitude !== undefined && body.longitude !== undefined) {
      // Web sends flat numbers: { latitude, longitude }
      latitude = body.latitude;
      longitude = body.longitude;
    } else {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required." },
        { status: 400 }
      );
    }

    // Validate location data
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Latitude and longitude must be numbers." },
        { status: 400 }
      );
    }

    // Get user's SOS contacts
    const contacts = await prisma.sosEmergencyContact.findMany({
      where: { userId: session.user.id },
      orderBy: { isPrimary: "desc" },
    });

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: "No SOS contacts configured. Add contacts in Settings > Emergency." },
        { status: 400 }
      );
    }

    const locationUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
    const geoJsonLocation = { type: "Point" as const, coordinates: [longitude, latitude] };

    // Create a SosAlert record for admin dispatch tracking
    let sosAlert = null;
    try {
      const prefix = new Date().getFullYear();
      const count = await prisma.sosAlert.count({
        where: { reporterId: session.user.id },
      });
      const sosAlertId = `SOS-${prefix}-${String(count + 1).padStart(3, "0")}`;

      sosAlert = await prisma.sosAlert.create({
        data: {
          sosAlertId,
          reporterId: session.user.id,
          location: geoJsonLocation,
          status: "TRIGGERED",
        },
      });
    } catch (alertError) {
      // Don't fail the SOS if SosAlert creation fails — log and continue
      console.error("[SOS Alert] Failed to create SosAlert record:", alertError);
    }

    // Import GikpsMail transporter and email function
    const { sendSOSAlertEmail } = await import("@/lib/email-verification");

    // Send emails to all contacts (non-blocking, parallel)
    const emailPromises = contacts.map(async (contact) => {
      if (!contact.email) return null;

      try {
        await sendSOSAlertEmail(
          contact.email,
          contact.name,
          locationUrl
        );
        return { contactId: contact.id, name: contact.name, status: "sent" };
      } catch (error) {
        console.error(`[SOS Alert] Failed to email ${contact.name}:`, error);
        return { contactId: contact.id, name: contact.name, status: "failed", error: String(error) };
      }
    });

    const results = await Promise.allSettled(emailPromises);

    // Count successes and failures
    const sentCount = results.filter((r) => r.status === "fulfilled" && r.value?.status === "sent").length;
    const failedCount = results.filter(
      (r) => r.status === "fulfilled" && r.value?.status === "failed"
    ).length;

    // Update SosAlert with sent status if it was created
    if (sosAlert && sentCount > 0) {
      try {
        await prisma.sosAlert.update({
          where: { id: sosAlert.id },
          data: { acknowledgedAt: new Date() },
        });
      } catch {} // Ignore update errors
    }

    return NextResponse.json({
      message: `SOS alert sent to ${sentCount} contact(s).`,
      contacts: results.map((r, i) => ({
        name: contacts[i].name,
        email: contacts[i].email,
        status: r.status === "fulfilled" ? (r.value as any).status : "failed",
      })),
      locationUrl,
      sosAlertId: sosAlert?.sosAlertId || null,
    }, { status: 200 });
  } catch (error) {
    console.error("[SOS Alert] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while sending SOS alert." },
      { status: 500 }
    );
  }
}
