import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET — Fetch notification preferences for the current user
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    });

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: session.user.id,
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

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Failed to fetch notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT — Update notification preferences for the current user
export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      hotspotAlerts,
      statusChanges,
      communityWarnings,
      sosResponses,
      emailEnabled,
      pushEnabled,
      radiusKm,
    }: {
      hotspotAlerts?: boolean;
      statusChanges?: boolean;
      communityWarnings?: boolean;
      sosResponses?: boolean;
      emailEnabled?: boolean;
      pushEnabled?: boolean;
      radiusKm?: number;
    } = body;

    // Validate radiusKm if provided
    if (radiusKm !== undefined && (radiusKm < 1 || radiusKm > 50)) {
      return NextResponse.json(
        { error: "Alert radius must be between 1 and 50 km" },
        { status: 400 }
      );
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {};
    if (hotspotAlerts !== undefined) updateData.hotspotAlerts = hotspotAlerts;
    if (statusChanges !== undefined) updateData.statusChanges = statusChanges;
    if (communityWarnings !== undefined) updateData.communityWarnings = communityWarnings;
    if (sosResponses !== undefined) updateData.sosResponses = sosResponses;
    if (emailEnabled !== undefined) updateData.emailEnabled = emailEnabled;
    if (pushEnabled !== undefined) updateData.pushEnabled = pushEnabled;
    if (radiusKm !== undefined) updateData.radiusKm = radiusKm;

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...updateData,
        hotspotAlerts: updateData.hotspotAlerts ?? true,
        statusChanges: updateData.statusChanges ?? true,
        communityWarnings: updateData.communityWarnings ?? true,
        sosResponses: updateData.sosResponses ?? true,
        emailEnabled: updateData.emailEnabled ?? false,
        pushEnabled: updateData.pushEnabled ?? true,
        radiusKm: updateData.radiusKm ?? 5,
      },
      update: updateData,
    });

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Failed to update notification preferences:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
