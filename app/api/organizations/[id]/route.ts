import { NextRequest, NextResponse } from "next/server";
import {
    getOrganizationById,
    updateOrganizationAction,
    deleteOrganizationAction,
} from "@/domain/organizations";

// GET /api/organizations/[id]
export const GET = async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: organizationId } = await params;
        const organization = await getOrganizationById(organizationId);

        if (!organization) {
            return NextResponse.json({ error: "Organization not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, organization }, { status: 200 });
    } catch (error) {
        console.error("[GET /api/organizations/[id]]", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
};

// PUT /api/organizations/[id]
export const PUT = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: organizationId } = await params;
        const data = await req.json();

        const result = await updateOrganizationAction(organizationId, data);

        if (result.error) {
            const status =
                result.error === "Unauthorized. Please sign in." ? 401
                    : result.error.includes("permission") ? 403
                        : 400;
            return NextResponse.json({ success: false, error: result.error }, { status });
        }

        return NextResponse.json(
            { success: true, message: "Organization updated successfully", organization: result.organization },
            { status: 200 }
        );
    } catch (error) {
        console.error("[PUT /api/organizations/[id]]", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
};

// DELETE /api/organizations/[id]
export const DELETE = async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: organizationId } = await params;
        const result = await deleteOrganizationAction(organizationId);

        if (result.error) {
            const status =
                result.error === "Unauthorized. Please sign in." ? 401
                    : result.error.includes("owner") ? 403
                        : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json({ message: "Organization deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("[DELETE /api/organizations/[id]]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};
