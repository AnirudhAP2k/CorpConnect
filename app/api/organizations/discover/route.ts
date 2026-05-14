import { NextRequest, NextResponse } from "next/server";
import { discoverOrganizations, discoverOrganizationsSchema } from "@/domain/organizations";

export const dynamic = "force-dynamic";

/**
 * GET /api/organizations/discover
 *
 * Thin wrapper — delegates filtering/pagination to the domain query.
 *
 * Query params: q, industry, size, location, tags, page, limit
 */
export const GET = async (req: NextRequest) => {
    const { searchParams } = req.nextUrl;

    const parsed = discoverOrganizationsSchema.safeParse({
        q: searchParams.get("q") ?? "",
        industry: searchParams.get("industry") ?? undefined,
        size: searchParams.get("size") ?? undefined,
        location: searchParams.get("location") ?? undefined,
        tags: searchParams.get("tags") ?? undefined,
        page: searchParams.get("page") ?? "1",
        limit: searchParams.get("limit") ?? "24",
    });

    if (!parsed.success) {
        return NextResponse.json(
            { error: "Invalid query parameters", details: parsed.error.flatten() },
            { status: 400 }
        );
    }

    const result = await discoverOrganizations(parsed.data);
    return NextResponse.json(result);
};
