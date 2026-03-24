import NextAuth from "next-auth";
import { prisma } from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "@/auth.config";
import { getUserById } from "./data/user";
import { getTwoFactorConfirmationbyUserId } from "@/data/two-factor-confirmation";
import { mapTokenToSession } from "@/auth.session";
import { generateRefreshToken } from "@/lib/tokens";
import { cookies } from "next/headers";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    ...authConfig,

    pages: {
        signIn: "/login",
        error: "/error"
    },

    session: {
        strategy: "jwt",
        maxAge: 15 * 60, // 15 min
    },

    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider !== "credentials") return true;

            if (!user.id) return false;

            const existingUser = await getUserById(user.id);
            if (!existingUser || !existingUser.emailVerified) return false;

            if (existingUser.isTwoFactorEnabled) {
                const twoFactorConfirmation = await getTwoFactorConfirmationbyUserId(existingUser.id);
                if (!twoFactorConfirmation) return false;

                await prisma.twoFactorConfirmation.delete({
                    where: { id: twoFactorConfirmation.id }
                });
            }

            const refreshToken = await generateRefreshToken(user.id);
            const cookieStore = await cookies();

            cookieStore.set("refreshToken", refreshToken.token, {
                httpOnly: true,
                secure: true,
                sameSite: "strict",
                path: "/",
                expires: refreshToken.expiresAt,
            });

            return true;
        },

        async jwt({ token, user, trigger }) {
            if (trigger === "signIn" && user && user.id) {
                token.sub = user.id;

                token.role = user.role;
                token.isAppAdmin = user.isAppAdmin;
                token.activeOrganizationId = user.activeOrganizationId;
                token.hasCompletedOnboarding = user.hasCompletedOnboarding;
            }

            return token;
        },

        async session({ session, token }) {
            return mapTokenToSession(session, token);
        },
    },
});