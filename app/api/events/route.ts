import { NextRequest, NextResponse } from "next/server";
import { getEventById, createEventAction, deleteEventAction, getEventsSchema, getEvents } from "@/domain/events";

// Get all events with optional filtering and pagination
export const GET = async (req: NextRequest) => {
    try {
        const searchParams = req.nextUrl.searchParams;

        const parsed = getEventsSchema.safeParse({
            q: searchParams.get("search") || "",
            visibility: searchParams.get("visibility") || undefined,
            upcoming: searchParams.get("upcoming") === "true",
            page: searchParams.get("page") || undefined,
            limit: searchParams.get("limit") || undefined,
            categoryId: searchParams.get("category") || undefined,
            organizationId: searchParams.get("organizationId") || undefined,
        });

        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid query parameters", details: parsed.error.flatten().fieldErrors },
                { status: 400 },
            );
        }

        const events = await getEvents(parsed.data);

        if (!events) {
            return NextResponse.json({ error: "No event found" }, { status: 404 });
        }

        return NextResponse.json(events, { status: 200 });
    } catch (error) {
        console.error("[GET /api/events]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};

// POST /api/events — create a new event
export const POST = async (req: NextRequest) => {
    try {
        const data = await req.json();
        const result = await createEventAction(data);

        if (result.error) {
            const status = result.error === "Unauthorized. Please sign in." ? 401
                : (result as any).code === "ORG_NOT_VERIFIED" ? 403
                    : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json(
            { message: "Event created successfully!", eventId: result.eventId },
            { status: 200 }
        );
    } catch (error) {
        console.error("[POST /api/events]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};

// DELETE /api/events?id=<uuid> — delete an event
export const DELETE = async (req: NextRequest) => {
    try {
        const eventId = req.nextUrl.searchParams.get("id");
        if (!eventId) {
            return NextResponse.json({ error: "Event ID is required" }, { status: 400 });
        }

        const result = await deleteEventAction(eventId);

        if (result.error) {
            const status = result.error === "Unauthorized. Please sign in." ? 401
                : result.error.includes("owner") ? 403
                    : 400;
            return NextResponse.json({ error: result.error }, { status });
        }

        return NextResponse.json({ message: "Event deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("[DELETE /api/events]", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
};
