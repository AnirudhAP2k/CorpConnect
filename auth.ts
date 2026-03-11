import NextAuth from "next-auth";
import { prisma } from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "@/auth.config";
import { getUserById } from "./data/user";
import { getTwoFactorConfirmationbyUserId } from "@/data/two-factor-confirmation";
import { mapTokenToSession } from "@/auth.session";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    ...authConfig,
    pages: {
        signIn: "/login",
        error: "/error"
    },
    events: {
        async linkAccount({ user }) {
            await prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: new Date() }
            })
        }
    },
    session: {
        strategy: "jwt",
    },
    callbacks: {
        async signIn({ user, account }) {

            if (account?.provider !== "credentials") return true;

            if (!user.id) return false;

            const existingUser = await getUserById(user.id);

            if (!existingUser) return false;

            if (!existingUser.emailVerified) return false;

            if (existingUser.isTwoFactorEnabled) {
                const twoFactorConfirmation = await getTwoFactorConfirmationbyUserId(existingUser.id);

                if (!twoFactorConfirmation) return false;

                await prisma.twoFactorConfirmation.delete({
                    where: { id: twoFactorConfirmation.id }
                });
            }

            return true;
        },
        async jwt({ token }) {

            if (!token.sub) return token;

            const existingUser = await getUserById(token.sub);

            if (!existingUser) return token;

            token.role = existingUser.role;
            token.isAppAdmin = existingUser.isAppAdmin;
            token.activeOrganizationId = existingUser.activeOrganizationId;
            token.hasCompletedOnboarding = existingUser.hasCompletedOnboarding;

            return token;
        },
        async session({ session, token }) {
            return mapTokenToSession(session, token);
        },
    },
});
