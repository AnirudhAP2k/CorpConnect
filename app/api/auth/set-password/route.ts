import { NextRequest, NextResponse } from "next/server";
import { setNewPasswordSchema } from "@/domain/users";
import { setNewPasswordAction } from "@/domain/auth";

export const POST = async (req: NextRequest) => {
    try {
        const token = req.nextUrl.searchParams.get("token");
        if (!token) {
            return NextResponse.json({ error: "Reset token missing." }, { status: 400 });
        }

        const data = await req.json();
        const parsed = setNewPasswordSchema.safeParse(data);

        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid password" }, { status: 400 });
        }

        const result = await setNewPasswordAction(token, parsed.data.password);

        if ("error" in result) {
            const status = result.error.includes("expired") ? 410 : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json({ message: result.message }, { status: 201 });
    } catch (error) {
        console.error("[POST /api/auth/set-password]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};
