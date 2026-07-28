import { z } from "zod";

export const updateReportSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED", "CROWD_REPORTED"]).optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export type UpdateReportInput = z.infer<typeof updateReportSchema>;
