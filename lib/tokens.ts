import { getVerificationTokenByEmail } from "@/data/verificationToken";
import { randomInt, randomUUID } from "crypto"
import { prisma } from "@/lib/db";
import { getPasswordResetTokenByEmail } from "@/data/password-reset-token";
import { getTwoFactorTokenbyEmail } from "@/data/two-factor-token";
import { hashToken } from "@/lib/utils";
import { cookies } from "next/headers";

export const REFRESH_TOKEN_EXPIRY_DAYS = 30;
export const GRACE_PERIOD_MS = 60 * 1000;

export const genVerificationToken = async (email: string) => {
    const token = randomUUID();
    const expiresAt = new Date(new Date().getTime() + 3600 * 1000);

    const existingToken = await getVerificationTokenByEmail(email);

    if (existingToken) {
        await prisma.verificationToken.delete({
            where: { id: existingToken.id }
        });
    }

    const verificationToken = await prisma.verificationToken.create({
        data: {
            email,
            token,
            expiresAt
        }
    });

    return verificationToken;
};

export const genPasswordResetToken = async (email: string) => {
    const token = randomUUID();
    const expiresAt = new Date(new Date().getTime() + 3600 * 1000);

    const existingToken = await getPasswordResetTokenByEmail(email);

    if (existingToken) {
        await prisma.passwordResetToken.delete({
            where: { id: existingToken.id }
        });
    }

    const passwordResetToken = await prisma.passwordResetToken.create({
        data: {
            email,
            token,
            expiresAt
        }
    });

    return passwordResetToken;
};

export const genTwoFactorToken = async (email: string) => {
    const token = randomInt(100 * 100, 1000 * 1000).toString();
    const expiresAt = new Date(new Date().getTime() + 900 * 1000);

    const existingToken = await getTwoFactorTokenbyEmail(email);

    if (existingToken) {
        await prisma.twoFactorToken.delete({
            where: { id: existingToken.id }
        });
    }

    const twoFactorToken = await prisma.twoFactorToken.create({
        data: {
            email,
            token,
            expiresAt
        }
    });

    return twoFactorToken;
};

export async function generateRefreshToken(userId: string, userAgent?: string, ip?: string) {
    const token = hashToken(randomUUID());

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    const refreshToken = await prisma.refreshToken.create({
        data: {
            token,
            userId,
            expiresAt,
            userAgent,
            ip,
        }
    });

    return refreshToken;
}

export async function rotateRefreshToken(oldToken: string, userAgent?: string, ip?: string) {
    const existingToken = await prisma.refreshToken.findUnique({
        where: { token: oldToken }
    });

    if (!existingToken) {
        throw new Error("Invalid refresh token");
    }

    if (existingToken.revokedAt) {
        const isWithinGracePeriod =
            new Date().getTime() - existingToken.revokedAt.getTime() < GRACE_PERIOD_MS;

        if (isWithinGracePeriod && existingToken.replacedBy) {
            const activeToken = await prisma.refreshToken.findUnique({
                where: { token: existingToken.replacedBy },
                include: { user: true }
            });

            if (activeToken && !activeToken.revokedAt) {
                return activeToken;
            }
        }

        await revokeAllUserTokens(existingToken.userId);
        throw new Error("Token reuse detected. All sessions revoked.");
    }

    if (new Date() > existingToken.expiresAt) {
        await prisma.refreshToken.update({
            where: { id: existingToken.id },
            data: { revokedAt: new Date() }
        });
        throw new Error("Refresh token expired");
    }

    const newTokenString = hashToken(randomUUID());
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);
    const [, newToken] = await prisma.$transaction([
        prisma.refreshToken.update({
            where: { id: existingToken.id },
            data: {
                revokedAt: new Date(),
                replacedBy: newTokenString
            }
        }),

        prisma.refreshToken.create({
            data: {
                token: newTokenString,
                userId: existingToken.userId,
                expiresAt,
                userAgent,
                ip,
            },
            include: { user: true }
        })
    ]);

    return newToken;
}

export async function revokeToken(token: string) {
    return prisma.refreshToken.update({
        where: { token },
        data: { revokedAt: new Date() }
    });
}

export async function revokeAllUserTokens(userId: string) {
    return prisma.refreshToken.updateMany({
        where: {
            userId,
            revokedAt: null
        },
        data: { revokedAt: new Date() }
    });
}

export const storeRefreshToken = async (token: string) => {
    let cookieStore = await cookies();

    cookieStore.set("refresh_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * REFRESH_TOKEN_EXPIRY_DAYS,
        path: "/",
    });
}
