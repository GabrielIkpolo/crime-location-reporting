import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// PATCH — Update an SOS contact
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactId = (await params).id;
    const body = await request.json();
    const { name, phone, email, isPrimary }: {
      name?: string;
      phone?: string;
      email?: string;
      isPrimary?: boolean;
    } = body;

    // Verify the contact belongs to the user
    const existing = await prisma.sosEmergencyContact.findFirst({
      where: { id: contactId, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Validate fields if provided
    if (name !== undefined && name.trim().length < 2) {
      return NextResponse.json(
        { error: "Contact name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (phone !== undefined && phone.trim() && !/^[+]?[\d\s\-()]{7,15}$/.test(phone.trim())) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    if (email !== undefined && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // If setting as primary, unset other primary contacts
    let updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim() || null;
    if (email !== undefined) updateData.email = email.trim() || null;

    const newIsPrimary = isPrimary === true;
    if (newIsPrimary) {
      await prisma.sosEmergencyContact.updateMany({
        where: {
          userId: session.user.id,
          isPrimary: true,
          id: { $ne: contactId },
        },
        data: { isPrimary: false },
      });
      updateData.isPrimary = true;
    } else if (isPrimary === false) {
      updateData.isPrimary = false;
    }

    const updated = await prisma.sosEmergencyContact.update({
      where: { id: contactId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update SOS contact:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE — Remove an SOS contact
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contactId = (await params).id;

    // Verify the contact belongs to the user
    const existing = await prisma.sosEmergencyContact.findFirst({
      where: { id: contactId, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    await prisma.sosEmergencyContact.delete({
      where: { id: contactId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete SOS contact:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
