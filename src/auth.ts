import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";
import { authConfig } from "./auth.config";

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
          // Delete the oldest session to make room for a new one
          await prisma.session.delete({
            where: { id: sessions[0].id },
          });
        }
      }
      return true;
    },
  },
});
