/**
 * Public API for the Auth domain.
 *
 * Note: The actual sign-in/sign-out flow is handled by NextAuth's
 * `signIn` / `signOut` from "@/auth". This domain encapsulates
 * the surrounding actions (registration, token verification, 2FA, etc.)
 */

// Types
export type { VerificationToken, PasswordResetToken, TwoFactorToken, TwoFactorConfirmation, AuthActionResult, RegisterResult } from "./types";

// Token queries (server-only)
export {
    getVerificationTokenByToken,
    getVerificationTokenByEmail,
    getPasswordResetTokenByToken,
    getPasswordResetTokenByEmail,
    getTwoFactorTokenByEmail,
    getTwoFactorTokenByToken,
    getTwoFactorConfirmationByUserId,
} from "./queries";

// Server Actions
export {
    registerAction,
    verifyEmailAction,
    requestPasswordResetAction,
    setNewPasswordAction,
    sendTwoFactorCodeAction,
    verifyTwoFactorCodeAction,
} from "./actions";
