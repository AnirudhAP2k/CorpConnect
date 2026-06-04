"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupMessageData {
    id: string;
    groupId: string;
    senderOrgId: string;
    senderUserId: string;
    content: string;
    createdAt: string;
    senderUser?: { id: string; name: string | null; image: string | null } | null;
    senderOrg?: { id: string; name: string; logo: string | null } | null;
}

interface GroupMessageBubbleProps {
    message: GroupMessageData;
    /** Whether this message was sent by the current user */
    isOwn: boolean;
    /**
     * True if this is the first message in a consecutive run from the same sender.
     * Used to decide whether to show the sender avatar and name.
     */
    showSenderInfo: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GroupMessageBubble({ message, isOwn, showSenderInfo }: GroupMessageBubbleProps) {
    const time = format(new Date(message.createdAt), "HH:mm");

    return (
        <div className={cn("flex items-end gap-2 group", isOwn ? "flex-row-reverse" : "flex-row")}>
            {/* Sender avatar — left side for incoming messages, space placeholder for own */}
            <div className="w-8 h-8 shrink-0">
                {!isOwn && showSenderInfo && message.senderUser && (
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-nx-surface-container border border-nx-outline-variant">
                        {message.senderUser.image ? (
                            <Image
                                src={message.senderUser.image}
                                alt={message.senderUser.name ?? "User"}
                                width={32}
                                height={32}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-nx-on-surface-variant bg-nx-surface-container-high">
                                {(message.senderUser.name ?? message.senderOrg?.name ?? "?").charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bubble column */}
            <div className={cn("max-w-[70%] flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
                {/* Sender name + org — shown once per consecutive run */}
                {!isOwn && showSenderInfo && (
                    <div className="flex items-baseline gap-1.5 px-1">
                        <span className="text-[11px] font-semibold text-nx-on-surface">
                            {message.senderUser?.name ?? "Unknown"}
                        </span>
                        {message.senderOrg && (
                            <span className="text-[10px] text-nx-on-surface-variant/60">
                                · {message.senderOrg.name}
                            </span>
                        )}
                    </div>
                )}

                {/* Message bubble */}
                <div
                    className={cn(
                        "relative px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                        isOwn
                            ? "bg-nx-primary text-white rounded-br-sm"
                            : "bg-white text-nx-on-surface border border-nx-outline-variant rounded-bl-sm"
                    )}
                >
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                </div>

                {/* Timestamp */}
                <div className={cn("flex items-center gap-1 px-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                    <span className="text-[10px] text-nx-on-surface-variant/60 tabular-nums">{time}</span>
                </div>
            </div>
        </div>
    );
}
