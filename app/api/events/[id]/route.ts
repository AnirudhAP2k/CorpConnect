import { NextRequest, NextResponse } from "next/server";
import { getEventById, updateEventAction, deleteEventAction } from "@/domain/events";

// PUT /api/events/[id] — update an event
export const PUT = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: eventId } = await params;
        const data = await req.json();
        const result = await updateEventAction(eventId, data);

        if (result.error) {
            const status = result.error === "Unauthorized. Please sign in." ? 401
                : result.error.includes("owners") ? 403
                    : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json(
            { message: "Event updated successfully!", event: result.event },
            { status: 200 }
        );
    } catch (error) {
        console.error("[PUT /api/events/[id]]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};

// DELETE /api/events/[id] — delete an event by path param
export const DELETE = async (
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: eventId } = await params;
        const result = await deleteEventAction(eventId);

        if (result.error) {
            const status = result.error === "Unauthorized. Please sign in." ? 401
                : result.error.includes("owners") ? 403
                    : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json({ message: "Event deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("[DELETE /api/events/[id]]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};
