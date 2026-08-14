import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

// Simple in-memory rate limiter for auth attempts (per IP)
const loginAttemptMap = new Map<string, { count: number; resetAt: number }>();

function checkLoginRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = loginAttemptMap.get(ip);

  if (!record || now > record.resetAt) {
    loginAttemptMap.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 min window
    return true;
  }

  if (record.count >= 5) {
    return false; // Rate limited
  }

  loginAttemptMap.set(ip, { count: record.count + 1, resetAt: record.resetAt });
  return true;
}

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Rate limit login attempts per IP address (Audit fix Phase 3 #4)
        const ip = req.headers.get("x-forwarded-for") 
          || req.headers.get("x-real-ip") 
          || "unknown";
        
        if (!checkLoginRateLimit(ip)) {
          console.warn(`[Auth] Login rate limit exceeded for IP: ${ip}`);
          // Return null to avoid revealing whether the account exists
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          return null;
        }

        // Check if email is verified (only for non-Google sign-ins)
        if (!user.emailVerified) {
          console.warn(`[Auth] Login attempt: ${user.email} - email not verified`);
          return { 
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
            unverifiedEmail: true,
          };
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as UserRole | undefined;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
      }
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
