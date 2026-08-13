import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

/**
 * POST /api/sos/alert
 * Sends emergency SOS alerts to all contacts via email (GikpsMail).
 * This is the server-side backbone of the SOS feature.
 */
export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { latitude, longitude } = body;

    // Validate location data
    if (
      latitude === undefined ||
      longitude === undefined ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required." },
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

    return NextResponse.json({
      message: `SOS alert sent to ${sentCount} contact(s).`,
      contacts: results.map((r, i) => ({
        name: contacts[i].name,
        email: contacts[i].email,
        status: r.status === "fulfilled" ? (r.value as any).status : "failed",
      })),
      locationUrl,
    }, { status: 200 });
  } catch (error) {
    console.error("[SOS Alert] Error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while sending SOS alert." },
      { status: 500 }
    );
  }
}
