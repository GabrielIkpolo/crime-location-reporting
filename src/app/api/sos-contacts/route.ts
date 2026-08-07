import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// GET — Fetch all SOS contacts for the current user
export async function GET(): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contacts = await prisma.sosEmergencyContact.findMany({
      where: { userId: session.user.id },
      orderBy: { isPrimary: "desc" },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error("Failed to fetch SOS contacts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST — Create a new SOS contact
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, email, isPrimary }: {
      name: string;
      phone?: string;
      email?: string;
      isPrimary?: boolean;
    } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Contact name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (phone && !/^[+]?[\d\s\-()]{7,15}$/.test(phone.trim())) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // If this contact is set as primary, unset other primary contacts
    let newIsPrimary = isPrimary === true;
    if (newIsPrimary) {
      await prisma.sosEmergencyContact.updateMany({
        where: {
          userId: session.user.id,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.sosEmergencyContact.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        isPrimary: newIsPrimary,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error("Failed to create SOS contact:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
