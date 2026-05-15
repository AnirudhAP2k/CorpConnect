import { NextRequest, NextResponse } from "next/server";
import { setActiveOrganizationAction } from "@/domain/users";

// POST /api/user/active-organization — Switch active org context
export const POST = async (req: NextRequest) => {
    try {
        const { organizationId } = await req.json();
        const result = await setActiveOrganizationAction(organizationId);

        if (!("success" in result)) {
            const status = result.error === "Unauthorized. Please sign in." ? 401
                : result.error?.includes("not a member") ? 403
                    : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json(
            { message: result.message, organization: result.organization },
            { status: 200 }
        );
    } catch (error) {
        console.error("[POST /api/user/active-organization]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};
