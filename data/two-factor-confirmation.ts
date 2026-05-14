/**
 * Two-Factor Confirmation Data — BACKWARD-COMPAT BRIDGE
 * Canonical: @/domain/auth
 *
 * Note: renamed from getTwoFactorConfirmationbyUserId → getTwoFactorConfirmationByUserId (camelCase fix)
 */
export {
    getTwoFactorConfirmationByUserId as getTwoFactorConfirmationbyUserId,
} from "@/domain/auth";