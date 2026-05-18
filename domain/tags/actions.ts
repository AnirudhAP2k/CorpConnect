"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createTagSchema } from "./validation";

/**
 * Public Server Action — creates or retrieves a tag by label.
 * Requires an active authenticated session.
 */
export async function createTag(labelInput: string) {
    const session = await auth();
    if (!session?.user?.id) {
        throw new Error("Unauthorized");
    }

    const { label } = createTagSchema.parse({ label: labelInput });

    const tag = await prisma.tag.upsert({
        where: { label },
        update: {},
        create: { label },
    });

    return tag;
}
