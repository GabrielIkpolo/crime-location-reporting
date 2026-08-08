import NextAuth from "next-auth";
import { middlewareAuthConfig } from "./auth.middleware.config";

/**
 * Minimal auth instance for Edge middleware.
 * 
 * Uses a separate config WITHOUT the Credentials provider because Prisma
 * (used by authorize()) cannot run in the Edge runtime. The middleware only
 * reads session data from the JWT cookie — it never calls authorize().
 * 
 * The role/identity fields were set during sign-in by the full auth.ts config
 * and are preserved in the signed JWT cookie shared across both instances.
 */
export const { auth: middlewareAuth } = NextAuth(middlewareAuthConfig);
