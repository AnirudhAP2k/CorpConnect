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

export const updateUserProfileSchema = z.object({
    name: z.string().min(1, "Name is required").max(100).optional(),
    image: z.union([
        z.string().url("Invalid image URL"),
        defaultAvatarSchema,
        z.literal(""),
    ]).optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
