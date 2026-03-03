import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { setOrgTags, getOrgTags } from "@/data/analytics";

// GET /api/organizations/[id]/tags
export const GET = async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: orgId } = await params;
    const tags = await getOrgTags(orgId);
    return NextResponse.json(tags);
};

// PUT /api/organizations/[id]/tags — set tags on org (OWNER/ADMIN only)
export const PUT = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    const { id: orgId } = await params;

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const member = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId, organizationId: orgId } },
        select: { role: true },
    });

    if (!member || (member.role !== "OWNER" && member.role !== "ADMIN")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const tags: string[] = Array.isArray(body.tags) ? body.tags : [];

    await setOrgTags(orgId, tags);
    const updatedTags = await getOrgTags(orgId);

    return NextResponse.json(updatedTags);
};
