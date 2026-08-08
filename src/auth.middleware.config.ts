/**
 * Minimal auth config for Edge middleware only.
 * 
 * IMPORTANT: This config does NOT include the Credentials provider,
 * because Prisma (used by authorize()) cannot run in the Edge runtime.
 * The middleware only needs to read the session/role from the JWT cookie —
 * it never calls authorize().
 * 
 * The full auth config with Credentials provider lives in auth.config.ts
 * and is used only by the /api/auth/[...nextauth] route (Node.js runtime).
 */
import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";
import Google from "next-auth/providers/google";

export const middlewareAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token }) {
      // Prisma is NOT available here — role comes from the cookie set during sign-in.
      // The full auth.ts config sets token.role in its JWT callback;
      // NextAuth v5 merges callbacks, so this field should already be present.
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.image as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
