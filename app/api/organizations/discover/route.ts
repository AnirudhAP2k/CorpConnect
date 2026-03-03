import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/organizations/discover
 *
 * Paginated, filtered browse of public organizations.
 * Excludes the calling user's own organizations.
 *
 * Query params:
 *   q          – keyword search on name + description
 *   industry   – industryId
 *   size       – STARTUP | SME | ENTERPRISE
 *   location   – free-text substring match
 *   tags       – comma-separated tag IDs
 *   page       – default 1
 *   limit      – default 24, max 48
 */
export const GET = async (req: NextRequest) => {
    const { searchParams } = req.nextUrl;

    const q = searchParams.get("q") ?? "";
    const industry = searchParams.get("industry") ?? "";
    const size = searchParams.get("size") ?? "";
    const location = searchParams.get("location") ?? "";
    const tags = searchParams.get("tags") ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(48, Math.max(1, parseInt(searchParams.get("limit") ?? "24", 10)));
    const skip = (page - 1) * limit;

    const tagIds = tags ? tags.split(",").filter(Boolean) : [];

    const where: any = {};

    if (q) {
        where.OR = [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
        ];
    }
    if (industry) where.industryId = industry;
    if (size) where.size = size;
    if (location) where.location = { contains: location, mode: "insensitive" };
    if (tagIds.length > 0) {
        where.orgTags = { some: { tagId: { in: tagIds } } };
    }

    const [organizations, total] = await Promise.all([
        prisma.organization.findMany({
            where,
            skip,
            take: limit,
            orderBy: [
                { isVerified: "desc" },  // verified orgs first
                { events: { _count: "desc" } },
                { createdAt: "desc" },
            ],
            select: {
                id: true,
                name: true,
                description: true,
                logo: true,
                location: true,
                size: true,
                isVerified: true,
                website: true,
                industry: { select: { id: true, label: true } },
                orgTags: {
                    take: 5,
                    select: { tag: { select: { id: true, label: true } } },
                },
                _count: {
                    select: { members: true, events: true },
                },
            },
        }),
        prisma.organization.count({ where }),
    ]);

    return NextResponse.json({
        organizations,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + organizations.length < total,
    });
};
