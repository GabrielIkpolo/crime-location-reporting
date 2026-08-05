import prisma from "./prisma";
import { Prisma } from "@prisma/client";

export async function logAdminAction({
  adminId,
  action,
  reportId,
  targetId, // Used for non-report actions like user deletion
}: {
  adminId: string;
  action: string;
  reportId?: string;
  targetId?: string;
}) {
  try {
    const data: Prisma.AdminLogCreateInput = {
      admin: { connect: { id: adminId } },
      action: `${action} ${targetId ? `(Target ID: ${targetId})` : ""}`,
    };
    if (reportId) {
      data.report = { connect: { id: reportId } };
    }
    await prisma.adminLog.create({ data });
  } catch (error) {
    console.error("[ADMIN_LOGGER_ERROR]:", error);
  }
}
