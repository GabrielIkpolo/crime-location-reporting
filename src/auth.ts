import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { authConfig } from "./auth.config";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (user.id) {
        const sessions = await prisma.session.findMany({
          where: { userId: user.id },
          orderBy: { expires: "asc" },
        });

        if (sessions.length >= 3) {
          // Delete the oldest session to make room for the new one
          // This ensures the user is limited to 3 devices/sessions
          await prisma.session.delete({
            where: { id: sessions[0].id },
          });
        }
      }
      return true;
    },
  },
  providers: [
    // Spread all providers from authConfig (like Google)
    ...authConfig.providers.filter((p) => p.id !== "credentials"),
    // Override Credentials provider with the real implementation
    {
      id: "credentials",
      name: "Credentials",
      type: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        };
      },
    },
  ],
});
