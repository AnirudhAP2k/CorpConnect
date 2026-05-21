import NextAuth from "next-auth";
import { prisma } from "@/lib/db";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "@/auth.config";
import { getUserById, getUserByEmail, getUserTier, getUserActiveOrgRole } from "@/data/user";
import { getTwoFactorConfirmationbyUserId } from "@/data/two-factor-confirmation";
import { mapTokenToSession } from "@/auth.session";
import { generateRefreshToken, revokeToken } from "@/lib/tokens";
import { storeRefreshToken } from "@/lib/tokens";
import { cookies } from "next/headers";
import { JWT_MAX_AGE_SECONDS } from "@/constants";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    ...authConfig,

    pages: {
        signIn: "/login",
        error: "/error"
    },

    session: {
        strategy: "jwt",
        maxAge: JWT_MAX_AGE_SECONDS,
    },

    events: {
        async signOut(message) {
            let cookieStore = await cookies();
            let refreshToken = cookieStore.get("refresh_token")?.value || null;

            if (refreshToken) {
                try {
                    await revokeToken(refreshToken);
                    cookieStore.delete("refresh_token");
                } catch (e) {
                    console.error("Refresh token error:", e);
                }
            }
        }
    },

    callbacks: {
        async signIn({ user, account, credentials }) {
            if (account?.provider === "credentials" && credentials) {
                const email = credentials.email as string | undefined;
                const password = credentials.password as string | undefined;

                if (!email || !password) return false;

                const dbUser = await getUserByEmail(email);
                if (!dbUser || !dbUser.password) return false;

                const isValid = await bcrypt.compare(password, dbUser.password);
                if (!isValid) return false;

                user.id = dbUser.id;
                user.isAppAdmin = dbUser.isAppAdmin;
                user.activeOrganizationId = dbUser.activeOrganizationId;
                user.hasCompletedOnboarding = dbUser.hasCompletedOnboarding;

                user.role = await getUserActiveOrgRole(dbUser.id, dbUser.activeOrganizationId);
            }

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
            if (trigger === "signIn" && user) {
                if (!user.id) return token;

                const { token: refreshToken } = await generateRefreshToken(user.id);
                await storeRefreshToken(refreshToken);

                const apiTier = await getUserTier(user.activeOrganizationId);

                token.sub = user.id;
                token.role = user.role;
                token.isAppAdmin = user.isAppAdmin;
                token.activeOrganizationId = user.activeOrganizationId;
                token.hasCompletedOnboarding = user.hasCompletedOnboarding;
                token.apiTier = apiTier;
            }

            return token;
        },

        async session({ session, token }) {
            return mapTokenToSession(session, token);
        },
    },
});