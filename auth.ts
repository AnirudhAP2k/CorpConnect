import NextAuth from "next-auth";
import { prisma } from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "@/auth.config";
import { getUserById } from "./data/user";
import { getTwoFactorConfirmationbyUserId } from "@/data/two-factor-confirmation";
import { mapTokenToSession } from "@/auth.session";
import { generateRefreshToken, rotateRefreshToken, revokeToken } from "@/lib/tokens";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    ...authConfig,

    pages: {
        signIn: "/login",
        error: "/error"
    },

    session: {
        strategy: "jwt",
        maxAge: 15 * 60, // 15 Minute Access Token
    },

    events: {
        async signOut(message) {
            if ("token" in message && message.token?.refreshToken) {
                try {
                    await revokeToken(message.token.refreshToken as string);
                } catch (e) {
                    console.error("Refresh token error:", e);
                }
            }
        }
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

            return true;
        },

        async jwt({ token, user, trigger }) {
            // 1. Initial Sign In
            if (trigger === "signIn" && user) {
                if (!user.id) return token;

                const refreshToken = await generateRefreshToken(user.id);
                token.accessTokenExpires = Date.now() + 15 * 60 * 1000;
                token.refreshToken = refreshToken.token;
                token.sub = user.id;

                token.role = user.role;
                token.isAppAdmin = user.isAppAdmin;
                token.activeOrganizationId = user.activeOrganizationId;
                token.hasCompletedOnboarding = user.hasCompletedOnboarding;
                return token;
            }

            if (Date.now() < (token.accessTokenExpires as number)) {
                return token;
            }

            try {
                if (!token.refreshToken) {
                    throw new Error("Missing refresh token");
                }

                const rotatedToken = await rotateRefreshToken(token.refreshToken as string);

                token.accessTokenExpires = Date.now() + 15 * 60 * 1000;
                token.refreshToken = rotatedToken.token;

                // User data is included in the rotated token — no extra DB call needed!
                token.role = rotatedToken.user.role;
                token.isAppAdmin = rotatedToken.user.isAppAdmin;
                token.activeOrganizationId = rotatedToken.user.activeOrganizationId;
                token.hasCompletedOnboarding = rotatedToken.user.hasCompletedOnboarding;

                return token;

            } catch (error) {
                console.error("Refresh token error:", error);

                return {
                    ...token,
                    error: "RefreshTokenError"
                };
            }
        },

        async session({ session, token }) {
            if (token.error) {
                session.error = token.error;
            }
            return mapTokenToSession(session, token);
        },
    },
});