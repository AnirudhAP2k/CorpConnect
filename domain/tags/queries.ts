import { prisma } from "@/lib/db";
import { Tag } from "./types";

export async function getTagSuggestions(query: string, take = 10): Promise<Pick<Tag, 'id' | 'label'>[]> {
    return prisma.tag.findMany({
        where: { label: { contains: query, mode: "insensitive" } },
        orderBy: { label: "asc" },
        take,
        select: { id: true, label: true },
    });
}

export async function getEventTags(eventId: string): Promise<Tag[]> {
    const rows = await prisma.eventTag.findMany({
        where: { eventId },
        include: { tag: true },
    });
    return rows.map((r) => r.tag);
}

export async function getOrgTags(orgId: string): Promise<Tag[]> {
    const rows = await prisma.orgTag.findMany({
        where: { orgId },
        include: { tag: true },
    });
    return rows.map((r) => r.tag);
}
