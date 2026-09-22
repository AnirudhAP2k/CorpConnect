"use client";

import type { RoomReaction } from "@/hooks/useVirtualRoomSocket";

export function ReactionsOverlay({ reactions }: { reactions: RoomReaction[] }) {
    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center gap-3">
            {reactions.slice(-8).map((reaction) => (
                <span
                    key={reaction.id}
                    className="animate-bounce rounded-full bg-gray-950/80 px-3 py-2 text-3xl shadow-xl"
                >
                    {reaction.emoji}
                </span>
            ))}
        </div>
    );
}
