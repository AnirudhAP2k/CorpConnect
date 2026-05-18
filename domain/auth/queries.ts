import { prisma } from "@/lib/db";
import type {
    VerificationToken,
    PasswordResetToken,
    TwoFactorToken,
    TwoFactorConfirmation,
} from "@prisma/client";

// ─── Verification tokens ──────────────────────────────────────────────────────

export async function getVerificationTokenByToken(
    token: string
): Promise<VerificationToken | null> {
    return prisma.verificationToken.findUnique({ where: { token } });
}

export async function getVerificationTokenByEmail(
    email: string
): Promise<VerificationToken | null> {
    return prisma.verificationToken.findFirst({ where: { email } });
}

// ─── Password reset tokens ────────────────────────────────────────────────────

export async function getPasswordResetTokenByToken(
    token: string
): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findFirst({ where: { token } });
}

export async function getPasswordResetTokenByEmail(
    email: string
): Promise<PasswordResetToken | null> {
    return prisma.passwordResetToken.findFirst({ where: { email } });
}

// ─── 2FA tokens ───────────────────────────────────────────────────────────────

export async function getTwoFactorTokenByEmail(
    email: string
): Promise<TwoFactorToken | null> {
    return prisma.twoFactorToken.findFirst({ where: { email } });
}

export async function getTwoFactorTokenByToken(
    token: string
): Promise<TwoFactorToken | null> {
    return prisma.twoFactorToken.findFirst({ where: { token } });
}

// ─── 2FA confirmations ────────────────────────────────────────────────────────

export async function getTwoFactorConfirmationByUserId(
    userId: string
): Promise<TwoFactorConfirmation | null> {
    return prisma.twoFactorConfirmation.findUnique({ where: { userId } });
}
