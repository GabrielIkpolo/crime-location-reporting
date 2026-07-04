import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Minimal NextAuth instance for Middleware (NO PRISMA, NO ADAPTER)
export const { auth: middlewareAuth } = NextAuth(authConfig);
