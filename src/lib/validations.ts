import { z } from "zod";

export const CRIME_TYPES = [
  "Theft",
  "Assault",
  "Robbery",
  "Vandalism",
  "Burglary",
  "Harassment",
  "Fraud",
  "Drug Related",
  "Other"
] as const;

export const userRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const userLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const reportSchema = z.object({
  type: z.enum(CRIME_TYPES),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000, "Description too long"),
  location: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([
      z.number().min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
      z.number().min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
    ]),
  }),
  isAnonymous: z.boolean().optional().default(false),
  mediaUrls: z.array(z.string()).optional(),
});

export type UserRegisterInput = z.infer<typeof userRegisterSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
