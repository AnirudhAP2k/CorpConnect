"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "./useSocket";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GroupMessage {
    id: string;
    groupId: string;
    senderOrgId: string;
    senderUserId: string;
    content: string;
    createdAt: string;
    senderUser?: { id: string; name: string | null; image: string | null } | undefined;
    senderOrg?: { id: string; name: string; logo: string | null } | undefined;
}

interface GroupReadReceipt {
    groupId: string;
    byUserId: string;
    byOrgId: string;
    lastReadMessageId: string;
}

interface UseGroupConversationOptions {
    groupId: string;
    /** Pre-loaded messages from SSR — merged with real-time updates. */
    initialMessages?: GroupMessage[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages real-time group chat state, mirroring useConversation.ts for direct messages.
 *
 * Features:
 * - Joins the `group:${groupId}` Socket.io room on mount
 * - Streams incoming messages in real-time
 * - Provides sendMessage / markRead helpers
 * - Loads older messages via cursor-based pagination
 * - Tracks typing indicators from other participants
 */
export function useGroupConversation({
    groupId,
    initialMessages = [],
}: UseGroupConversationOptions) {
    const { socket, connected } = useSocket();
    const [messages, setMessages] = useState<GroupMessage[]>(initialMessages);
    const [isLoading, setIsLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [typingUsers, setTypingUsers] = useState<{ userId: string; orgId: string }[]>([]);
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const typingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

    // ── Room join / leave ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !groupId) return;

        socket.emit("join_group", { groupId });

        return () => {
            socket.emit("leave_group", groupId);
        };
    }, [socket, groupId]);

    // ── Incoming message listener ──────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleNewMessage = (msg: GroupMessage) => {
            if (msg.groupId !== groupId) return;
            setMessages((prev) => {
                // Deduplicate by ID in case of SSR race
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            // Auto-scroll to bottom
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        };

        socket.on("new_group_message", handleNewMessage);
        return () => { socket.off("new_group_message", handleNewMessage); };
    }, [socket, groupId]);

    // ── Typing indicator listener ─────────────────────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleTyping = (data: { groupId: string; userId: string; orgId: string; typing: boolean }) => {
            if (data.groupId !== groupId) return;

            setTypingUsers((prev) => {
                if (data.typing) {
                    const already = prev.some((u) => u.userId === data.userId);
                    return already ? prev : [...prev, { userId: data.userId, orgId: data.orgId }];
                } else {
                    return prev.filter((u) => u.userId !== data.userId);
                }
            });

            // Auto-clear typing indicator after 3 seconds of silence
            const existing = typingTimers.current.get(data.userId);
            if (existing) clearTimeout(existing);
            if (data.typing) {
                const timer = setTimeout(() => {
                    setTypingUsers((prev) => prev.filter((u) => u.userId !== data.userId));
                }, 3000);
                typingTimers.current.set(data.userId, timer);
            }
        };

        socket.on("group_typing", handleTyping);
        return () => { socket.off("group_typing", handleTyping); };
    }, [socket, groupId]);

    // ── Mark read on mount ────────────────────────────────────────────────────
    useEffect(() => {
        if (!socket || !groupId) return;
        socket.emit("mark_group_read", groupId);
    }, [socket, groupId]);

    // ── Send message ──────────────────────────────────────────────────────────
    const sendMessage = useCallback((content: string): Promise<{ ok?: boolean; error?: string }> => {
        return new Promise((resolve) => {
            if (!socket) return resolve({ error: "Socket not connected" });

            socket.emit(
                "send_group_message",
                { groupId, content },
                (res: { ok?: boolean; error?: string }) => resolve(res)
            );
        });
    }, [socket, groupId]);

    // ── Typing signal ─────────────────────────────────────────────────────────
    const sendTyping = useCallback((typing: boolean) => {
        if (!socket) return;
        socket.emit("group_typing", { groupId, typing });
    }, [socket, groupId]);

    // ── Load older messages ───────────────────────────────────────────────────
    const loadOlderMessages = useCallback(async () => {
        if (isLoading || !hasMore) return;
        setIsLoading(true);

        try {
            const url = nextCursor
                ? `/api/messaging/groups/${groupId}/messages?cursor=${encodeURIComponent(nextCursor)}`
                : `/api/messaging/groups/${groupId}/messages`;

            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch messages");

            const data: { messages: GroupMessage[]; nextCursor: string | null } = await res.json();

            setMessages((prev) => [...data.messages, ...prev]);
            setNextCursor(data.nextCursor);
            setHasMore(data.nextCursor !== null);
        } catch (err) {
            console.error("[useGroupConversation] loadOlderMessages error:", err);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, hasMore, nextCursor, groupId]);

    return {
        messages,
        typingUsers,
        isLoading,
        hasMore,
        bottomRef,
        sendMessage,
        sendTyping,
        loadOlderMessages,
        connected,
    };
}
