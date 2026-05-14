"use client";

import Image from "next/image";
import { WifiOff } from "lucide-react";
import { useConversation } from "@/hooks/useConversation";
import { useSocket } from "@/hooks/useSocket";
import { MessageList } from "@/components/messaging/MessageList";
import { MessageInput } from "@/components/messaging/MessageInput";
import type { DirectMessage } from "@/hooks/useConversation";

interface ChatWindowProps {
    conversationId: string;
    activeOrgId: string;
    otherOrg: {
        id: string;
        name: string;
        logo: string | null;
        isVerified: boolean;
    };
    initialMessages: DirectMessage[];
}

export function ChatWindow({
    conversationId,
    activeOrgId,
    otherOrg,
    initialMessages,
}: ChatWindowProps) {
    const { connected } = useSocket();
    const { messages, sendMessage, markRead, loadOlderMessages, isLoading } = useConversation({
        conversationId,
        initialMessages,
    });

    return (
        <div className="flex flex-col h-full">
            {/* ── Chat Header ── */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-nx-outline-variant bg-white">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-nx-surface-container border border-nx-outline-variant">
                        {otherOrg.logo ? (
                            <Image
                                src={otherOrg.logo}
                                alt={otherOrg.name}
                                width={40}
                                height={40}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm font-bold text-nx-on-surface-variant bg-nx-surface-container-high">
                                {otherOrg.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-nx-on-surface flex items-center gap-1">
                            {otherOrg.name}
                            {otherOrg.isVerified && (
                                <span className="text-nx-primary text-[11px]">✓</span>
                            )}
                        </p>
                        <p className="text-xs text-nx-on-surface-variant">Organization</p>
                    </div>
                </div>

                {/* Connection status */}
                {!connected && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                        <WifiOff className="w-3.5 h-3.5" />
                        Reconnecting…
                    </div>
                )}
            </div>

            {/* ── Messages ── */}
            <MessageList
                messages={messages}
                activeOrgId={activeOrgId}
                isLoadingMore={isLoading}
                onScrollTop={loadOlderMessages}
            />

            {/* ── Input ── */}
            <MessageInput
                onSend={(content) => {
                    sendMessage(content);
                    markRead();
                }}
                disabled={!connected}
                placeholder={connected ? "Write a message…" : "Reconnecting to server…"}
            />
        </div>
    );
}
