import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { VirtualRoom } from "@/components/virtual/VirtualRoom";

interface JoinRoomPageProps {
    params: Promise<{ id: string; roomId: string }>;
}

export default async function JoinRoomPage({ params }: JoinRoomPageProps) {
    const session = await auth();
    if (!session?.user?.id) {
        const { id, roomId } = await params;
        redirect(`/login?callbackUrl=/events/${id}/join/${roomId}`);
    }

    const { id: eventId, roomId } = await params;

    // Fetch event and room in parallel
    const [event, room] = await Promise.all([
        prisma.events.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                title: true,
                eventType: true,
                startDateTime: true,
                endDateTime: true,
            },
        }),
        prisma.virtualRoom.findUnique({
            where: { id: roomId },
            select: { id: true, isActive: true, eventId: true },
        }),
    ]);

    if (!event) notFound();

    // Only ONLINE and HYBRID events have virtual rooms
    if (!["ONLINE", "HYBRID"].includes(event.eventType)) notFound();

    // Room must exist, be active, and belong to this event
    if (!room || !room.isActive || room.eventId !== eventId) notFound();

    return (
        // Full-screen — no navbar or wrapper
        <main className="fixed inset-0 z-50 bg-gray-950">
            <VirtualRoom
                roomId={roomId}
                eventId={eventId}
                eventTitle={event.title}
            />
        </main>
    );
}

export async function generateMetadata({ params }: JoinRoomPageProps) {
    const { id } = await params;
    const event = await prisma.events.findUnique({
        where: { id },
        select: { title: true },
    });
    return {
        title: event ? `Join: ${event.title} | CorpConnect` : "Join Virtual Session",
    };
}
