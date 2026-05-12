// Skeleton loading states for messaging UI
import { cn } from "@/lib/utils";

export function ConversationItemSkeleton() {
    return (
        <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-nx-surface-container-high shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
                <div className="flex items-center justify-between">
                    <div className="h-3 w-28 rounded bg-nx-surface-container-high" />
                    <div className="h-2.5 w-12 rounded bg-nx-surface-container-high" />
                </div>
                <div className="h-2.5 w-40 rounded bg-nx-surface-container-high" />
            </div>
        </div>
    );
}

export function ConversationListSkeleton() {
    return (
        <div className="flex flex-col h-full bg-[#f8f7f8]">
            {/* Header skeleton */}
            <div className="px-4 pt-5 pb-3 border-b border-nx-outline-variant/60 animate-pulse space-y-1.5">
                <div className="h-4 w-28 rounded bg-nx-surface-container-high" />
                <div className="h-2.5 w-20 rounded bg-nx-surface-container-high" />
            </div>
            <div className="flex-1 px-2 py-2 space-y-0.5">
                {Array.from({ length: 6 }).map((_, i) => (
                    <ConversationItemSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}

export function MessageBubbleSkeleton({ isOwn = false }: { isOwn?: boolean }) {
    return (
        <div className={cn("flex items-end gap-2 animate-pulse", isOwn ? "flex-row-reverse" : "flex-row")}>
            {!isOwn && <div className="w-8 h-8 rounded-lg bg-nx-surface-container-high shrink-0" />}
            <div
                className={cn(
                    "rounded-2xl bg-nx-surface-container-high",
                    isOwn ? "rounded-br-sm" : "rounded-bl-sm"
                )}
                style={{ width: `${120 + Math.random() * 140}px`, height: "36px" }}
            />
        </div>
    );
}

export function MessageListSkeleton() {
    return (
        <div className="flex-1 overflow-hidden px-4 py-4 flex flex-col gap-3">
            <MessageBubbleSkeleton />
            <MessageBubbleSkeleton isOwn />
            <MessageBubbleSkeleton />
            <MessageBubbleSkeleton />
            <MessageBubbleSkeleton isOwn />
            <MessageBubbleSkeleton isOwn />
            <MessageBubbleSkeleton />
        </div>
    );
}
