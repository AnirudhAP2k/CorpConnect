/**
 * Two-Factor Token Data — BACKWARD-COMPAT BRIDGE
 * Canonical: @/domain/auth
 *
 * Note: renamed from getTwoFactorTokenbyEmail → getTwoFactorTokenByEmail (camelCase fix)
 */
export {
    getTwoFactorTokenByEmail as getTwoFactorTokenbyEmail,
    getTwoFactorTokenByToken as getTwoFactorTokenbyToken,
} from "@/domain/auth";