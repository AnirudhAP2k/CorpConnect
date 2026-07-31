import { z } from "zod";

// Re-export auth schemas from lib/validation so domain consumers
// use a single import path. lib/validation is kept for legacy callers.
export {
    LoginSchema as loginSchema,
    RegisterSchema as registerSchema,
    ResetSchema as resetSchema,
    SetNewPasswordSchema as setNewPasswordSchema,
} from "@/lib/validation";

// ─── Active org switch ────────────────────────────────────────────────────────

export const setActiveOrganizationSchema = z.object({
    organizationId: z.string().uuid("Invalid organization ID"),
});

export type SetActiveOrganizationInput = z.infer<typeof setActiveOrganizationSchema>;

// ─── Profile update ───────────────────────────────────────────────────────────

const defaultAvatarSchema = z.enum([
    "/assets/avatars/avatar-blue.svg",
    "/assets/avatars/avatar-violet.svg",
    "/assets/avatars/avatar-amber.svg",
    "/assets/avatars/avatar-emerald.svg",
]);

// Trims input and treats a blank field as "clear this value".
const optionalText = (max: number, label: string) =>
    z.string().trim().max(max, `${label} must be ${max} characters or fewer`).optional();

const optionalUrl = (label: string) =>
    z.union([z.string().trim().url(`${label} must be a valid URL`), z.literal("")]).optional();

export const updateUserProfileSchema = z.object({
    name: z.string().min(1, "Name is required").max(100).optional(),
    image: z.union([
        z.string().url("Invalid image URL"),
        defaultAvatarSchema,
        z.literal(""),
    ]).optional(),
    headline: optionalText(120, "Headline"),
    bio: optionalText(600, "Bio"),
    location: optionalText(120, "Location"),
    phone: z.union([
        z.string().trim().min(6, "Phone number is too short").max(30, "Phone number is too long")
            .regex(/^[+()\d][\d\s()+-]*$/, "Phone number contains invalid characters"),
        z.literal(""),
    ]).optional(),
    linkedinUrl: optionalUrl("LinkedIn URL"),
    websiteUrl: optionalUrl("Website URL"),
    twitterUrl: optionalUrl("X/Twitter URL"),
    isTwoFactorEnabled: z.boolean().optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
