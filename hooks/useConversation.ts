"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSocket } from "./useSocket";

export interface DirectMessage {
    id: string;
    conversationId: string;
    senderOrgId: string;
    senderUserId: string;
    content: string;
    status: "SENT" | "DELIVERED" | "READ";
    createdAt: string;
    senderOrg?: { id: string; name: string; logo: string | null };
    senderUser?: { id: string; name: string | null; image: string | null };
}

interface UseConversationOptions {
    conversationId: string;
    /** Initial messages loaded from the server via SSR / REST fetch. */
    initialMessages?: DirectMessage[];
}

/**
 * Manages real-time state for a single conversation.
 *  - Joins the Socket.io room when mounted, leaves on unmount.
 *  - Appends incoming messages to state.
 *  - Exposes sendMessage, markRead, and loading status.
 */
export function useConversation({ conversationId, initialMessages = [] }: UseConversationOptions) {
    const { socket, connected } = useSocket();
    const [messages, setMessages] = useState<DirectMessage[]>(initialMessages);
    const [isLoading, setIsLoading] = useState(false);
    const hasJoinedRef = useRef(false);

    // Join / leave the conversation room
    useEffect(() => {
        if (!socket || !conversationId) return;

        socket.emit("join_conversation", conversationId);
        hasJoinedRef.current = true;

        return () => {
            socket.emit("leave_conversation", conversationId);
            hasJoinedRef.current = false;
        };
    }, [socket, conversationId]);

    // Listen for new messages
    useEffect(() => {
        if (!socket) return;

        const onNewMessage = (msg: DirectMessage) => {
            if (msg.conversationId !== conversationId) return;
            setMessages((prev) => {
                // Prevent duplicates (e.g., if sender receives their own echo)
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
        };

        const onMessagesRead = ({ conversationId: cid, byOrgId }: { conversationId: string; byOrgId: string }) => {
            if (cid !== conversationId) return;
            setMessages((prev) =>
                prev.map((m) =>
                    m.senderOrgId !== byOrgId && m.status !== "READ"
                        ? { ...m, status: "READ" }
                        : m
                )
            );
        };

        socket.on("new_message", onNewMessage);
        socket.on("messages_read", onMessagesRead);

        return () => {
            socket.off("new_message", onNewMessage);
            socket.off("messages_read", onMessagesRead);
        };
    }, [socket, conversationId]);

    const sendMessage = useCallback(
        (content: string) => {
            if (!socket || !content.trim()) return;

            socket.emit(
                "send_message",
                { conversationId, content: content.trim() },
                (response: { ok?: boolean; error?: string }) => {
                    if (response?.error) {
                        console.error("[useConversation] Send error:", response.error);
                    }
                }
            );
        },
        [socket, conversationId]
    );

    const markRead = useCallback(() => {
        if (!socket) return;
        socket.emit("mark_read", conversationId);
    }, [socket, conversationId]);

    /**
     * Load older messages (infinite scroll). Fetches the page BEFORE the
     * oldest currently loaded message via the REST cursor API.
     */
    const loadOlderMessages = useCallback(async () => {
        if (isLoading || messages.length === 0) return;
        const oldestId = messages[0]?.id;
        if (!oldestId) return;

        setIsLoading(true);
        try {
            const res = await fetch(
                `/api/messaging/conversations/${conversationId}/messages?before=${oldestId}&limit=30`
            );
            if (res.ok) {
                const older: DirectMessage[] = await res.json();
                setMessages((prev) => [...older, ...prev]);
            }
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, isLoading, messages]);

    return {
        messages,
        sendMessage,
        markRead,
        loadOlderMessages,
        isLoading,
        connected,
    };
}
