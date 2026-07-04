"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { reportSchema } from "@/lib/validations"; 
import { z } from "zod";

// Simple registration schema
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function registerUserAction(formData: any) {
  try {
    // Validate input
    const validated = registerSchema.parse(formData);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validated.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        password: hashedPassword,
        role: "USER",
      },
    });

    return { success: true, user: { name: user.name, email: user.email } };
  } catch (error: any) {
    return { success: false, error: error.message || "Registration failed" };
  }
}
