import { z } from "zod";

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
  type: z.string().min(1, "Crime type is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  location: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([
      z.number(), // longitude
      z.number(), // latitude
    ]),
  }),
  isAnonymous: z.boolean().optional().default(false),
  mediaUrls: z.array(z.string()).optional(),
});

export type UserRegisterInput = z.infer<typeof userRegisterSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
