import { NextRequest, NextResponse } from "next/server";
import { organizationSubmitSchema, createOrganizationAction } from "@/domain/organizations";

/**
 * POST /api/organizations
 *
 * Thin wrapper — delegates org creation to the domain action.
 * Auth and validation are handled inside createOrganizationAction.
 */
export const POST = async (req: NextRequest) => {
    try {
        const body = await req.json();

        // Build a FormData-like object for the action (keeps the action signature mobile-compatible)
        const formData = new FormData();
        Object.entries(body).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                formData.set(key, JSON.stringify(value));
            } else if (value !== undefined && value !== null) {
                formData.set(key, String(value));
            }
        });

        if (body.logo) formData.set("logo", body.logo);

        const result = await createOrganizationAction(formData);

        if (result.error) {
            const status = result.error === "Unauthorized. Please sign in." ? 401 : 400;
            return NextResponse.json({ success: false, error: result.error }, { status });
        }

        return NextResponse.json(
            {
                success: true,
                message: "Organization created! Complete your KYB documents to unlock all features.",
                organization: result.organizationId,
                kybUrl: result.kybUrl,
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("[POST /api/organizations]", error);
        return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
    }
};
