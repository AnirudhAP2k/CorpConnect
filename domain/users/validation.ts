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

export const updateUserProfileSchema = z.object({
    name: z.string().min(1, "Name is required").max(100).optional(),
    image: z.string().url("Invalid image URL").optional().or(z.literal("")),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;
