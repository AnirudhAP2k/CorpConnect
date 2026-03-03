import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { getTagSuggestions } from "@/data/analytics";
import { prisma } from "@/lib/db";

// GET /api/tags?q=query — autocomplete tag search
export const GET = async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const tags = await getTagSuggestions(q, 15);
    return NextResponse.json(tags);
};

// POST /api/tags — create a new tag (authenticated)
export const POST = async (req: NextRequest) => {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const label = (body.label as string)?.trim().toLowerCase().replace(/\s+/g, "-");

    if (!label) {
        return NextResponse.json({ error: "label is required" }, { status: 400 });
    }

    const tag = await prisma.tag.upsert({
        where: { label },
        update: {},
        create: { label },
    });

    return NextResponse.json(tag, { status: 201 });
};
