"use client";

import { useEffect, useRef, useCallback } from "react";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import { MessageBubble } from "./MessageBubble";
import { Loader2 } from "lucide-react";
import type { DirectMessage } from "@/hooks/useConversation";

interface MessageListProps {
    messages: DirectMessage[];
    activeOrgId: string;
    isLoadingMore?: boolean;
    onScrollTop?: () => void;
}

function DateSeparator({ date }: { date: Date }) {
    const label = isToday(date)
        ? "Today"
        : isYesterday(date)
            ? "Yesterday"
            : format(date, "EEEE, MMMM d");

    return (
        <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-nx-outline-variant/60" />
            <span className="text-[11px] font-semibold text-nx-on-surface-variant/60 px-2 whitespace-nowrap">
                {label}
            </span>
            <div className="flex-1 h-px bg-nx-outline-variant/60" />
        </div>
    );
}

export function MessageList({
    messages,
    activeOrgId,
    isLoadingMore,
    onScrollTop,
}: MessageListProps) {
    const bottomRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const prevScrollHeight = useRef(0);

    // Auto-scroll to bottom when a new message arrives
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    // Preserve scroll position when loading older messages above
    useEffect(() => {
        if (isLoadingMore) {
            prevScrollHeight.current = containerRef.current?.scrollHeight ?? 0;
        } else if (prevScrollHeight.current && containerRef.current) {
            const newScrollHeight = containerRef.current.scrollHeight;
            containerRef.current.scrollTop = newScrollHeight - prevScrollHeight.current;
            prevScrollHeight.current = 0;
        }
    }, [isLoadingMore]);

    const handleScroll = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        // Trigger load-more when user scrolls within 80px of the top
        if (el.scrollTop < 80 && onScrollTop) {
            onScrollTop();
        }
    }, [onScrollTop]);

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-nx-primary-container flex items-center justify-center text-3xl">
                    💬
                </div>
                <p className="text-nx-on-surface font-semibold">Start the conversation</p>
                <p className="text-sm text-nx-on-surface-variant">
                    Send a message to get the discussion going.
                </p>
            </div>
        );
    }

    // Group messages into day-separated runs
    const rendered: React.ReactNode[] = [];
    let lastDate: Date | null = null;

    messages.forEach((msg, idx) => {
        const msgDate = new Date(msg.createdAt);

        // Date separator
        if (!lastDate || !isSameDay(lastDate, msgDate)) {
            rendered.push(<DateSeparator key={`date-${msg.id}`} date={msgDate} />);
            lastDate = msgDate;
        }

        const isOwn = msg.senderOrgId === activeOrgId;
        // Show avatar only for the last message in a consecutive run from the same sender
        const nextMsg = messages[idx + 1];
        const showAvatar = !nextMsg || nextMsg.senderOrgId !== msg.senderOrgId;

        rendered.push(
            <MessageBubble
                key={msg.id}
                message={msg}
                isOwn={isOwn}
                showAvatar={showAvatar}
            />
        );
    });

    return (
        <div
            ref={containerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-1 scroll-smooth"
        >
            {/* Load more spinner */}
            {isLoadingMore && (
                <div className="flex justify-center py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-nx-on-surface-variant" />
                </div>
            )}

            {rendered}

            <div ref={bottomRef} />
        </div>
    );
}
