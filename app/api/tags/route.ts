import { NextRequest, NextResponse } from "next/server";
import { getTagSuggestions, createTag } from "@/domain/tags";

export const GET = async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";

    const tags = await getTagSuggestions(q, 15);
    return NextResponse.json(tags);
};

export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json().catch(() => ({}));
        
        if (!body.label) {
            return NextResponse.json({ error: "label is required" }, { status: 400 });
        }
        
        const tag = await createTag(body.label);
        return NextResponse.json(tag, { status: 201 });
    } catch (error: any) {
        if (error.message === "Unauthorized") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};
