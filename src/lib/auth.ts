import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { db } from "@/lib/db";
import { users } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    AzureADProvider({
      clientId: process.env.MICROSOFT_CLIENT_ID!,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
      tenantId: "common",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email || !user.name) return false;

      const existing = await db.query.users.findFirst({
        where: eq(users.microsoftId, account.providerAccountId),
      });

      if (!existing) {
        await db.insert(users).values({
          email: user.email,
          name: user.name,
          microsoftId: account.providerAccountId,
        });
      }

      return true;
    },
    async session({ session, token }) {
      if (token.sub && session.user) {
        const dbUser = await db.query.users.findFirst({
          where: eq(users.microsoftId, token.sub),
        });
        if (dbUser) {
          (session.user as Record<string, unknown>).id = dbUser.id;
        }
      }
      return session;
    },
    async jwt({ token, account }) {
      if (account) {
        token.sub = account.providerAccountId;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
};
