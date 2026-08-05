import { z } from "zod";

export const updateReportSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED", "CROWD_REPORTED"]).optional(),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
});

export const updateSettingSchema = z.object({
  key: z.string().min(1, "Key is required").max(50, "Key must be 50 characters or less"),
  value: z.string(),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  role: z.enum(["USER", "ADMIN"]),
});

export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type UpdateSettingInput = z.infer<typeof updateSettingSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
