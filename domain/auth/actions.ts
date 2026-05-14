"use server";

import { prisma } from "@/lib/db";
import bcryptjs from "bcryptjs";
import { genVerificationToken, genPasswordResetToken, genTwoFactorToken } from "@/lib/tokens";
import { sendMail } from "@/lib/mailer";
import { tokenVerificationBaseLink, passwordResetTokenBaseLink } from "@/constants";
import { getUserByEmail } from "@/domain/users/queries";
import {
    getVerificationTokenByToken,
    getPasswordResetTokenByToken,
    getTwoFactorTokenByEmail,
    getTwoFactorConfirmationByUserId,
} from "./queries";
import type { RegisterResult, AuthActionResult } from "./types";

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Creates a new user account and sends a verification email.
 * Does NOT sign the user in — they must verify email first.
 */
export async function registerAction(data: {
    name: string;
    email: string;
    password: string;
}): Promise<RegisterResult> {
    const existing = await getUserByEmail(data.email);
    if (existing) return { error: "An account with this email already exists." };

    try {
        const verificationToken = await genVerificationToken(data.email);

        const mail = await sendMail({
            email: process.env.SENDER_EMAIL || "alerts@corpconnect.com",
            sendTo: verificationToken.email,
            subject: "Verify your email address",
            html: `<p>To verify your email, <a href="${tokenVerificationBaseLink}${verificationToken.token}">click here</a>. This link expires in 1 hour.</p>`,
        });

        if (!mail) {
            return { error: "Unable to send verification email. Please try again later." };
        }

        const salt = await bcryptjs.genSalt();
        const hashedPassword = await bcryptjs.hash(data.password, salt);

        await prisma.user.create({
            data: { name: data.name, email: data.email, password: hashedPassword },
        });

        return { success: true, message: "Verification email sent. Please check your inbox." };
    } catch (error) {
        console.error("[registerAction]", error);
        return { error: "Failed to create account. Please try again." };
    }
}

// ─── Email verification ───────────────────────────────────────────────────────

/**
 * Verifies an email address using the token from the verification email.
 */
export async function verifyEmailAction(token: string): Promise<AuthActionResult> {
    const existingToken = await getVerificationTokenByToken(token);
    if (!existingToken) return { error: "Verification token not found." };

    if (new Date(existingToken.expiresAt) < new Date()) {
        return { error: "Verification token has expired. Please request a new one." };
    }

    const user = await getUserByEmail(existingToken.email);
    if (!user) return { error: "No account found for this email." };

    try {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { emailVerified: new Date(), email: existingToken.email },
            }),
            prisma.verificationToken.delete({ where: { id: existingToken.id } }),
        ]);

        return { success: true, message: "Email verified successfully." };
    } catch (error) {
        console.error("[verifyEmailAction]", error);
        return { error: "Failed to verify email. Please try again." };
    }
}

// ─── Password reset ───────────────────────────────────────────────────────────

/**
 * Sends a password reset email.
 */
export async function requestPasswordResetAction(email: string): Promise<AuthActionResult> {
    const user = await getUserByEmail(email);
    if (!user) return { error: "No account found with this email address." };

    try {
        const token = await genPasswordResetToken(email);
        if (!token) return { error: "Unable to generate reset token. Please try again." };

        const mail = await sendMail({
            email: process.env.SENDER_EMAIL || "alerts@corpconnect.com",
            sendTo: token.email,
            subject: "Password Reset",
            html: `<p>To reset your password, <a href="${passwordResetTokenBaseLink}${token.token}">click here</a>. This link expires in 1 hour.</p>`,
        });

        if (!mail) return { error: "Unable to send reset email. Please try again later." };

        return { success: true, message: "Password reset email sent successfully." };
    } catch (error) {
        console.error("[requestPasswordResetAction]", error);
        return { error: "Failed to send reset email. Please try again." };
    }
}

/**
 * Sets a new password using a valid reset token.
 */
export async function setNewPasswordAction(
    token: string,
    password: string
): Promise<AuthActionResult> {
    const existingToken = await getPasswordResetTokenByToken(token);
    if (!existingToken) return { error: "Reset token not found." };

    if (new Date(existingToken.expiresAt) < new Date()) {
        return { error: "Reset token has expired. Please request a new one." };
    }

    const user = await getUserByEmail(existingToken.email);
    if (!user) return { error: "No account found for this email." };

    try {
        const salt = await bcryptjs.genSalt();
        const hashedPassword = await bcryptjs.hash(password, salt);

        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            }),
            prisma.passwordResetToken.delete({ where: { id: existingToken.id } }),
        ]);

        return { success: true, message: "Password updated successfully." };
    } catch (error) {
        console.error("[setNewPasswordAction]", error);
        return { error: "Failed to update password. Please try again." };
    }
}

// ─── 2FA helpers (used inside login flow) ────────────────────────────────────

/**
 * Sends a 2FA code to the user's email.
 * Returns { success, showTwoFactor: true } to signal the UI to show the code input.
 */
export async function sendTwoFactorCodeAction(email: string): Promise<AuthActionResult> {
    try {
        const token = await genTwoFactorToken(email);
        if (!token) return { error: "Unable to generate 2FA token. Please try again." };

        const mail = await sendMail({
            email: process.env.SENDER_EMAIL || "alerts@corpconnect.com",
            sendTo: token.email,
            subject: "Verify your login",
            html: `<p>Your 2FA code is: <strong>${token.token}</strong>. It expires in 15 minutes.</p>`,
        });

        if (!mail?.messageId) {
            return { error: "Unable to send 2FA code. Please try again." };
        }

        return { success: true, message: "2FA code sent.", showTwoFactor: true };
    } catch (error) {
        console.error("[sendTwoFactorCodeAction]", error);
        return { error: "Failed to send 2FA code. Please try again." };
    }
}

/**
 * Validates a 2FA code and creates a confirmation record.
 * Call this before completing the sign-in flow.
 */
export async function verifyTwoFactorCodeAction(
    email: string,
    code: string
): Promise<AuthActionResult> {
    try {
        const token = await getTwoFactorTokenByEmail(email);

        if (!token || token.token !== code) {
            return { error: "Invalid 2FA code." };
        }
        if (new Date(token.expiresAt) < new Date()) {
            return { error: "2FA code has expired. Please request a new one." };
        }

        const user = await getUserByEmail(email);
        if (!user) return { error: "User not found." };

        const existing = await getTwoFactorConfirmationByUserId(user.id);

        await prisma.$transaction([
            prisma.twoFactorToken.delete({ where: { id: token.id } }),
            ...(existing
                ? [prisma.twoFactorConfirmation.delete({ where: { id: existing.id } })]
                : []),
            prisma.twoFactorConfirmation.create({ data: { userId: user.id } }),
        ]);

        return { success: true, message: "2FA verified." };
    } catch (error) {
        console.error("[verifyTwoFactorCodeAction]", error);
        return { error: "Failed to verify 2FA code. Please try again." };
    }
}
