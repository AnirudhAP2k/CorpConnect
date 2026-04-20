import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { enqueueMatchingRules } from "@/lib/jobs/automation";

// POST /api/events/[id]/participate - Join event
export const POST = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: eventId } = await params;

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user with organization
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                activeOrganizationId: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Fetch event
        const event = await prisma.events.findUnique({
            where: { id: eventId },
            include: {
                participations: {
                    where: { userId },
                },
                organization: {
                    include: {
                        members: {
                            where: { userId },
                        },
                    },
                },
            },
        });

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 });
        }

        // Get organizationId from request body or fall back to user's active org
        const body = await req.json().catch(() => ({}));
        const organizationId = body.organizationId ?? user.activeOrganizationId;

        // ── Phase 6: Payment-mode guards ─────────────────────────────────────
        const hostOrg = event.organization as any;
        const hostPlan = hostOrg?.subscriptionPlan ?? "FREE";

        // Layer 1: Paid events are blocked for FREE tier orgs
        if (
            (event.paymentMode === "PLATFORM" || event.paymentMode === "EXTERNAL") &&
            hostPlan === "FREE"
        ) {
            return NextResponse.json(
                {
                    error: "This event requires a paid plan. The organizing org must upgrade to PRO or ENTERPRISE.",
                    code: "UPGRADE_REQUIRED",
                },
                { status: 402 }
            );
        }

        // Layer 4: isVerified gate
        if (
            (event.paymentMode === "PLATFORM" || event.paymentMode === "EXTERNAL") &&
            !hostOrg?.isVerified
        ) {
            return NextResponse.json(
                { error: "The organizing org is not yet verified to host paid events.", code: "ORG_NOT_VERIFIED" },
                { status: 403 }
            );
        }

        // PLATFORM mode: block direct registration — user must go through checkout first
        if (event.paymentMode === "PLATFORM") {
            // Allow if already has a PENDING_PAYMENT participation (created by checkout route)
            const pending = await prisma.eventParticipation.findUnique({
                where: { eventId_userId: { eventId, userId } },
                select: { id: true, status: true },
            });
            if (!pending || pending.status !== "PENDING_PAYMENT") {
                return NextResponse.json(
                    {
                        error: "Please complete payment before registering for this event.",
                        code: "PAYMENT_REQUIRED",
                    },
                    { status: 402 }
                );
            }
            // Participation already created by checkout — nothing more to do here
            return NextResponse.json({ message: "Awaiting payment confirmation" }, { status: 200 });
        }

        // Check if already participating
        if (event.participations.length > 0) {
            return NextResponse.json(
                { error: "You are already registered for this event" },
                { status: 400 }
            );
        }

        // Check visibility permissions
        if (event.visibility === "PRIVATE") {
            const isMember = (event.organization?.members.length || 0) > 0;
            if (!isMember) {
                return NextResponse.json(
                    { error: "This event is only for organization members" },
                    { status: 403 }
                );
            }
        }

        // Check capacity
        // Layer 2: FREE tier attendee cap (50 per event)
        const effectiveMax =
            event.maxAttendees ??
            (hostPlan === "FREE" ? 50 : null);
        if (effectiveMax && event.attendeeCount >= effectiveMax) {
            return NextResponse.json(
                { error: hostPlan === "FREE" ? "Event has reached the FREE tier attendee limit (50)." : "Event is full" },
                { status: 400 }
            );
        }

        // Determine participation status
        const participationStatus = event.paymentMode === "EXTERNAL" ? "PENDING_PAYMENT" : "REGISTERED";

        // Create participation
        await prisma.$transaction(async (tx) => {
            await tx.eventParticipation.create({
                data: {
                    eventId,
                    userId,
                    organizationId,
                    status: participationStatus,
                },
            });

            // Increment attendee count
            await tx.events.update({
                where: { id: eventId },
                data: {
                    attendeeCount: {
                        increment: 1,
                    },
                },
            });
        });

        // Record org→org interaction if attending org differs from hosting org
        const hostOrgId = event.organizationId;
        if (hostOrgId && organizationId && hostOrgId !== organizationId) {
            try {
                await prisma.orgInteraction.createMany({
                    data: [
                        { sourceOrgId: hostOrgId, targetOrgId: organizationId, sharedEventId: eventId },
                        { sourceOrgId: organizationId, targetOrgId: hostOrgId, sharedEventId: eventId },
                    ],
                    skipDuplicates: true,
                });
            } catch {
                // Non-fatal: silently skip if it fails
            }
        }

        // Fire automation rules for the hosting org (EVENT_REGISTRATION trigger)
        if (hostOrgId) {
            enqueueMatchingRules("EVENT_REGISTRATION", hostOrgId, {
                eventId,
                userId,
                attendeeOrgId: organizationId ?? null,
            }).catch(() => { });
        }

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/my-events");

        return NextResponse.json(
            { message: "Successfully joined event!" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Join event error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};

// DELETE /api/events/[id]/participate - Leave event
export const DELETE = async (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) => {
    try {
        const { id: eventId } = await params;

        const session = await auth();
        const userId = session?.user?.id;

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Find participation
        const participation = await prisma.eventParticipation.findFirst({
            where: {
                eventId,
                userId,
            },
        });

        if (!participation) {
            return NextResponse.json(
                { error: "You are not registered for this event" },
                { status: 404 }
            );
        }

        // Delete participation and decrement count
        await prisma.$transaction(async (tx) => {
            await tx.eventParticipation.delete({
                where: { id: participation.id },
            });

            await tx.events.update({
                where: { id: eventId },
                data: {
                    attendeeCount: {
                        decrement: 1,
                    },
                },
            });
        });

        revalidatePath(`/events/${eventId}`);
        revalidatePath("/my-events");

        return NextResponse.json(
            { message: "Successfully left event" },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("Leave event error:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};
