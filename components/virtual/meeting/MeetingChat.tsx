"use client";

import { Chat, formatChatMessageLinks } from "@livekit/components-react";

export function MeetingChat() {
    return (
        <aside className="flex h-full min-h-0 flex-col border-l border-white/10 bg-gray-950 text-white">
            <div className="shrink-0 border-b border-white/10 px-4 py-3 font-semibold">
                Meeting chat
            </div>
            <div className="min-h-0 flex-1">
                <Chat messageFormatter={formatChatMessageLinks} />
            </div>
        </aside>
    );
}
