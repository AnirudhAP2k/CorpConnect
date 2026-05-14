import type {
    VerificationToken,
    PasswordResetToken,
    TwoFactorToken,
    TwoFactorConfirmation,
} from "@prisma/client";

// ─── Re-exports ───────────────────────────────────────────────────────────────

export type {
    VerificationToken,
    PasswordResetToken,
    TwoFactorToken,
    TwoFactorConfirmation,
};

// ─── Action result types ──────────────────────────────────────────────────────

export type AuthActionResult =
    | { success: true; message: string; showTwoFactor?: boolean }
    | { error: string; code?: string };

export type RegisterResult =
    | { success: true; message: string }
    | { error: string };
