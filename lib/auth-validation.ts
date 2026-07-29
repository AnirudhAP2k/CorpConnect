import { z } from "zod";

/**
 * Edge-safe credentials schema used by auth.config.ts.
 *
 * Keep this module free of Prisma runtime imports: auth.config.ts is bundled into
 * Next.js middleware and must run in the Edge runtime.
 */
export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, {
        message: "Password is required",
    }),
    code: z.string().optional(),
});
