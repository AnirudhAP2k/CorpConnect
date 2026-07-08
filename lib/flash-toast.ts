/**
 * Flash toast message registry.
 *
 * Server-side code redirects with a short code: redirect("/dashboard?flash=unauthorized")
 * The client-side QueryToastListener maps the code to the full message + type.
 *
 * Why codes instead of raw messages?
 *  - No full messages visible in the URL bar
 *  - Codes are not user-tamperable (unknown codes are silently ignored)
 *  - Works from Server Components (no cookie restriction)
 */

export type FlashType = "error" | "success" | "warning" | "info";

export interface FlashEntry {
    type: FlashType;
    message: string;
}

/**
 * Registry of all flash toast codes → display config.
 * Add new codes here when you need a new server→client notification.
 */
export const FLASH_REGISTRY: Record<string, FlashEntry> = {
    unauthorized: {
        type: "warning",
        message: "You are not authorized to access this page.",
    },
    login_required: {
        type: "error",
        message: "Please log in to continue.",
    },
    org_required: {
        type: "info",
        message: "Please complete onboarding to access this feature.",
    },
    session_expired: {
        type: "warning",
        message: "Your session has expired. Please log in again.",
    },
} as const;
