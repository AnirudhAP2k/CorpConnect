"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Check, CheckCheck } from "lucide-react";
import type { DirectMessage } from "@/hooks/useConversation";

interface MessageBubbleProps {
    message: DirectMessage;
    isOwn: boolean;
    showAvatar: boolean;
}

export function MessageBubble({ message, isOwn, showAvatar }: MessageBubbleProps) {
    const time = format(new Date(message.createdAt), "HH:mm");

    return (
        <div
            className={cn(
                "flex items-end gap-2 group",
                isOwn ? "flex-row-reverse" : "flex-row"
            )}
        >
            {/* Sender avatar — only shown for incoming, only on last message in a run */}
            <div className="w-8 h-8 shrink-0">
                {!isOwn && showAvatar && message.senderOrg && (
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-nx-surface-container border border-nx-outline-variant">
                        {message.senderOrg.logo ? (
                            <Image
                                src={message.senderOrg.logo}
                                alt={message.senderOrg.name}
                                width={32}
                                height={32}
                                className="object-cover w-full h-full"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-nx-on-surface-variant bg-nx-surface-container-high">
                                {message.senderOrg.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Bubble */}
            <div className={cn("max-w-[70%] flex flex-col gap-1", isOwn ? "items-end" : "items-start")}>
                {/* Sender name for incoming messages (only when showing avatar) */}
                {!isOwn && showAvatar && message.senderOrg && (
                    <span className="text-[11px] font-semibold text-nx-on-surface-variant px-1">
                        {message.senderUser?.name ?? message.senderOrg.name}
                    </span>
                )}

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

                {/* Timestamp + read receipt */}
                <div className={cn("flex items-center gap-1 px-1", isOwn ? "flex-row-reverse" : "flex-row")}>
                    <span className="text-[10px] text-nx-on-surface-variant/60 tabular-nums">{time}</span>
                    {isOwn && (
                        <span className="text-nx-on-surface-variant/50">
                            {message.status === "READ" ? (
                                <CheckCheck className="w-3.5 h-3.5 text-nx-primary" />
                            ) : (
                                <Check className="w-3.5 h-3.5" />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
