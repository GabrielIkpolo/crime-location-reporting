import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAdmin } from "@/lib/auth-helper";

/**
 * PATCH /api/admin/messages/[id]
 * Admin-only: Mark a message as read/unread.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const messageId = (await params).id;
    const body = await req.json();
    const { isRead }: { isRead?: boolean } = body;

    if (isRead === undefined) {
      return NextResponse.json(
        { error: "isRead field is required." },
        { status: 400 }
      );
    }

    const message = await prisma.contactMessage.update({
      where: { id: messageId },
      data: { isRead },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("[Admin Messages] Failed to update read status:", error);
    return NextResponse.json(
      { error: "Failed to update message." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/messages/[id]
 * Admin-only: Delete a contact message.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin(req))) {
      return NextResponse.json({ error: "Unauthorized. Admin access required." }, { status: 403 });
    }

    const messageId = (await params).id;

    await prisma.contactMessage.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("[Admin Messages] Failed to delete message:", error);
    return NextResponse.json(
      { error: "Failed to delete message." },
      { status: 500 }
    );
  }
}
