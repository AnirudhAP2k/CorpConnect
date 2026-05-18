import { z } from "zod";

export const tagSchema = z.object({
    id: z.string().uuid().optional(),
    label: z.string().min(1, "Tag label is required")
        .transform(val => val.trim().toLowerCase().replace(/\s+/g, "-")),
});

export const createTagSchema = tagSchema.omit({ id: true });
