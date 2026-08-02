import prisma from "./prisma";

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
    const data: any = {
      adminId,
      action: `${action} ${targetId ? `(Target ID: ${targetId})` : ""}`,
    };
    if (reportId) {
      data.reportId = reportId;
    }
    await prisma.adminLog.create({ data });
  } catch (error) {
    console.error("[ADMIN_LOGGER_ERROR]:", error);
  }
}
