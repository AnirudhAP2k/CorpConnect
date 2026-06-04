"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type React from "react";
import { cn } from "@/lib/utils";
import { Users, WifiOff, ChevronUp, LogOut } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { useGroupConversation } from "@/hooks/useGroupConversation";
import type { GroupMessage } from "@/hooks/useGroupConversation";
import { GroupMessageBubble } from "@/components/messaging/GroupMessageBubble";
import { MessageInput } from "@/components/messaging/MessageInput";
import { GroupMembersPanel } from "@/components/messaging/GroupMembersPanel";
import { format, isToday, isYesterday } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
// GroupMessage is imported from the hook — defined there to avoid type conflicts.

interface GroupMember {
    id: string;
    userId: string;
    orgId: string;
    role: string;
    joinedAt: string;
    user?: { id: string; name: string | null; image: string | null; email: string | null } | null;
    organization?: { id: string; name: string; logo: string | null } | null;
}

interface GroupChatWindowProps {
    groupId: string;
    groupName: string;
    groupDescription: string | null;
    members: GroupMember[];
    currentUserId: string;
    currentUserRole: string;
    initialMessages: GroupMessage[];
    onLeaveGroup?: () => Promise<void> | void;
}

// ─── Date Separator ──────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: Date }) {
    const label = isToday(date) ? "Today" : isYesterday(date) ? "Yesterday" : format(date, "MMMM d, yyyy");
    return (
        <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-nx-outline-variant/50" />
            <span className="text-[10px] font-semibold text-nx-on-surface-variant/60 uppercase tracking-widest shrink-0">
                {label}
            </span>
            <div className="flex-1 h-px bg-nx-outline-variant/50" />
        </div>
    );
}

// ─── GroupChatWindow ──────────────────────────────────────────────────────────

export function GroupChatWindow({
    groupId,
    groupName,
    groupDescription,
    members,
    currentUserId,
    currentUserRole,
    initialMessages,
    onLeaveGroup,
}: GroupChatWindowProps) {
    const { connected } = useSocket();
    const [membersOpen, setMembersOpen] = useState(false);
    const [inviteOpen, setInviteOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const {
        messages,
        typingUsers,
        isLoading,
        hasMore,
        sendMessage,
        sendTyping,
        loadOlderMessages,
    } = useGroupConversation({ groupId, initialMessages });

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Typing debounce ref
    const typingTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const handleInputChange = useCallback(() => {
        sendTyping(true);
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => sendTyping(false), 2000);
    }, [sendTyping]);

    const handleSend = useCallback(async (content: string) => {
        sendTyping(false);
        await sendMessage(content);
    }, [sendMessage, sendTyping]);

    // Group messages into runs per sender for avatar/name display
    const renderedMessages: React.ReactNode[] = [];
    let lastDate: string | null = null;
    let lastSenderId: string | null = null;

    for (const msg of messages) {
        const msgDate = format(new Date(msg.createdAt), "yyyy-MM-dd");
        if (msgDate !== lastDate) {
            renderedMessages.push(<DateSeparator key={`date-${msgDate}`} date={new Date(msg.createdAt)} />);
            lastDate = msgDate;
            lastSenderId = null; // reset run after date separator
        }

        const isOwn = msg.senderUserId === currentUserId;
        const showSenderInfo = msg.senderUserId !== lastSenderId;
        lastSenderId = msg.senderUserId;

        renderedMessages.push(
            <GroupMessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showSenderInfo={showSenderInfo}
            />
        );
    }

    return (
        <div className="flex flex-col h-full relative">
            {/* ── Chat Header ── */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-b border-nx-outline-variant bg-white">
                <div className="flex items-center gap-3 min-w-0">
                    {/* Group icon */}
                    <div className="w-10 h-10 rounded-xl bg-nx-primary-container/50 border border-nx-primary/20 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-nx-primary" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-nx-on-surface truncate">{groupName}</p>
                        <p className="text-xs text-nx-on-surface-variant">
                            {members.length} member{members.length !== 1 ? "s" : ""}
                            {groupDescription && (
                                <> · <span className="truncate">{groupDescription}</span></>
                            )}
                        </p>
                    </div>
                </div>

                {/* Header actions */}
                <div className="flex items-center gap-2 shrink-0">
                    {!connected && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
                            <WifiOff className="w-3.5 h-3.5" />
                            Reconnecting…
                        </div>
                    )}
                    {/* Members toggle */}
                    <button
                        onClick={() => setMembersOpen((v) => !v)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            membersOpen
                                ? "bg-nx-primary text-white"
                                : "bg-nx-surface-container hover:bg-nx-primary-container/60 text-nx-on-surface-variant"
                        )}
                        aria-label="Toggle member list"
                    >
                        <Users className="w-3.5 h-3.5" />
                        Members
                    </button>
                    {/* Leave group */}
                    {currentUserRole !== "OWNER" && onLeaveGroup && (
                        <button
                            onClick={onLeaveGroup}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-600 text-nx-on-surface-variant transition-colors"
                            title="Leave group"
                            aria-label="Leave group"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Messages Area ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1.5">
                {/* Load older messages button */}
                {hasMore && (
                    <button
                        onClick={loadOlderMessages}
                        disabled={isLoading}
                        className="self-center flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-nx-outline-variant bg-white text-xs text-nx-on-surface-variant hover:bg-nx-surface-container transition-colors mb-2 disabled:opacity-50"
                    >
                        <ChevronUp className="w-3.5 h-3.5" />
                        {isLoading ? "Loading…" : "Load older messages"}
                    </button>
                )}

                {messages.length === 0 && !isLoading && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                        <div className="w-16 h-16 rounded-2xl bg-nx-primary-container/40 border border-nx-primary/20 flex items-center justify-center mb-4">
                            <Users className="w-8 h-8 text-nx-primary/60" />
                        </div>
                        <p className="text-sm font-semibold text-nx-on-surface">No messages yet</p>
                        <p className="text-xs text-nx-on-surface-variant mt-1">
                            Be the first to say something to the group!
                        </p>
                    </div>
                )}

                {renderedMessages}

                {/* Typing indicators */}
                {typingUsers.length > 0 && (
                    <div className="flex items-center gap-2 px-1 mt-1">
                        <div className="flex gap-1 items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-nx-on-surface-variant/40 animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-nx-on-surface-variant/40 animate-bounce [animation-delay:150ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-nx-on-surface-variant/40 animate-bounce [animation-delay:300ms]" />
                        </div>
                        <span className="text-[11px] text-nx-on-surface-variant/60">
                            {typingUsers.length === 1
                                ? "Someone is typing…"
                                : `${typingUsers.length} people are typing…`}
                        </span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <MessageInput
                onSend={handleSend}
                disabled={!connected}
                placeholder={connected ? `Message ${groupName}…` : "Reconnecting to server…"}
            />

            {/* ── Members Slide Panel ── */}
            <GroupMembersPanel
                groupId={groupId}
                members={members}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                isOpen={membersOpen}
                onClose={() => setMembersOpen(false)}
                onInvite={() => { setMembersOpen(false); setInviteOpen(true); }}
            />
        </div>
    );
}
