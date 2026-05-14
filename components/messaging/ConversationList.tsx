"use client";

import { usePathname } from "next/navigation";
import { ConversationItem } from "@/components/messaging/ConversationItem";
import { MessageSquare, Search } from "lucide-react";
import { useState } from "react";

interface ConversationSummary {
    id: string;
    otherOrg: {
        id: string;
        name: string;
        logo: string | null;
        isVerified: boolean;
    };
    lastMessage: {
        content: string;
        createdAt: string;
        senderOrgId: string;
    } | null;
    unreadCount: number;
    updatedAt: string;
}

interface ConversationListProps {
    conversations: ConversationSummary[];
    activeOrgId: string;
}

export function ConversationList({ conversations, activeOrgId }: ConversationListProps) {
    const pathname = usePathname();
    const [query, setQuery] = useState("");

    const filtered = conversations.filter((c) =>
        c.otherOrg.name.toLowerCase().includes(query.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#f8f7f8]">
            {/* Header */}
            <div className="px-4 pt-5 pb-3 shrink-0 border-b border-nx-outline-variant/60">
                <h2 className="text-base font-headline font-bold text-nx-on-surface flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-nx-primary" />
                    Messages
                </h2>
                <p className="text-xs text-nx-on-surface-variant mt-0.5">
                    {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
                </p>
            </div>

            {/* Search */}
            {conversations.length > 3 && (
                <div className="px-3 py-2 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-nx-on-surface-variant/50" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search conversations…"
                            className="w-full pl-8 pr-3 py-2 rounded-lg text-xs bg-white border border-nx-outline-variant focus:outline-none focus:border-nx-primary focus:ring-2 focus:ring-nx-primary/10 placeholder:text-nx-on-surface-variant/50"
                        />
                    </div>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                        <MessageSquare className="w-10 h-10 text-nx-on-surface-variant/30 mb-3" />
                        <p className="text-sm font-medium text-nx-on-surface-variant">
                            {query ? "No conversations found" : "No conversations yet"}
                        </p>
                        {!query && (
                            <p className="text-xs text-nx-on-surface-variant/60 mt-1">
                                Connect with an organization to start messaging.
                            </p>
                        )}
                    </div>
                ) : (
                    filtered.map((conv) => {
                        const activeConvId = pathname.split("/messaging/")[1]?.split("/")[0];
                        return (
                            <ConversationItem
                                key={conv.id}
                                {...conv}
                                isActive={activeConvId === conv.id}
                                activeOrgId={activeOrgId}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}
