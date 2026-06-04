"use client";

import { useState, useRef, useCallback, useEffect, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Send, Loader2, FileText, ChevronRight, RotateCcw } from "lucide-react";
import { format } from "date-fns";
import type { AIEventBrief } from "@/lib/ai-service";
import { PitchBriefModal } from "@/components/organizations/PitchBriefModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface BrainstormChatProps {
    userId: string;
    organizationId: string;
}

// ─── Loading dots component ───────────────────────────────────────────────────

function ThinkingDots() {
    return (
        <div className="flex items-center gap-1.5 px-4 py-3">
            <span className="w-2 h-2 rounded-full bg-nx-primary/60 animate-bounce [animation-delay:0ms]" />
            <span className="w-2 h-2 rounded-full bg-nx-primary/60 animate-bounce [animation-delay:150ms]" />
            <span className="w-2 h-2 rounded-full bg-nx-primary/60 animate-bounce [animation-delay:300ms]" />
        </div>
    );
}

// ─── BrainstormChat ───────────────────────────────────────────────────────────

export function BrainstormChat({ userId, organizationId }: BrainstormChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "Hi! 👋 I'm your AI event strategist. Tell me about the event idea you'd like to explore — even a rough concept works. What's on your mind?",
            timestamp: new Date(),
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [sessionId, setSessionId] = useState("new");
    const [isThinking, setIsThinking] = useState(false);
    const [isBriefLoading, setIsBriefLoading] = useState(false);
    const [brief, setBrief] = useState<AIEventBrief | null>(null);
    const [briefModalOpen, setBriefModalOpen] = useState(false);
    const [canExtractBrief, setCanExtractBrief] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isThinking]);

    // Enable "Generate Brief" after at least 4 exchanges
    useEffect(() => {
        const userCount = messages.filter((m) => m.role === "user").length;
        setCanExtractBrief(userCount >= 2);
    }, [messages]);

    // ── Send message ─────────────────────────────────────────────────────────
    const handleSend = useCallback(async () => {
        const trimmed = inputValue.trim();
        if (!trimmed || isThinking) return;

        const userMsg: ChatMessage = { role: "user", content: trimmed, timestamp: new Date() };
        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setIsThinking(true);

        // Auto-reset textarea height
        if (textareaRef.current) textareaRef.current.style.height = "auto";

        try {
            const res = await fetch("/api/ai/brainstorm/message", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, userId, organizationId, message: trimmed }),
            });
            const data: { sessionId: string; reply: string } = await res.json();
            setSessionId(data.sessionId);
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: data.reply, timestamp: new Date() },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: "assistant", content: "Sorry, I'm having trouble connecting. Please try again.", timestamp: new Date() },
            ]);
        } finally {
            setIsThinking(false);
        }
    }, [inputValue, isThinking, sessionId, userId, organizationId]);

    // ── Extract brief ────────────────────────────────────────────────────────
    const handleExtractBrief = useCallback(async () => {
        if (!canExtractBrief || isBriefLoading || sessionId === "new") return;
        setIsBriefLoading(true);
        try {
            const res = await fetch("/api/ai/brainstorm/brief", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionId, userId, organizationId }),
            });
            const data: { sessionId: string; brief: AIEventBrief } = await res.json();
            setBrief(data.brief);
            setBriefModalOpen(true);
        } catch {
            // Leave brief null — modal won't open
        } finally {
            setIsBriefLoading(false);
        }
    }, [canExtractBrief, isBriefLoading, sessionId, userId, organizationId]);

    // ── Reset session ────────────────────────────────────────────────────────
    const handleReset = () => {
        setMessages([{
            role: "assistant",
            content: "Starting fresh! What new event idea would you like to explore?",
            timestamp: new Date(),
        }]);
        setSessionId("new");
        setCanExtractBrief(false);
        setBrief(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        const el = textareaRef.current;
        if (el) { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 160)}px`; }
    };

    return (
        <div className="flex flex-col h-full">
            {/* ── Action bar ── */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-2 border-b border-nx-outline-variant/60 bg-white">
                <p className="text-xs text-nx-on-surface-variant">
                    {messages.filter((m) => m.role === "user").length} exchange{messages.filter((m) => m.role === "user").length !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-nx-on-surface-variant hover:bg-nx-surface-container transition-colors"
                        aria-label="Reset conversation"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        New idea
                    </button>
                    <button
                        onClick={handleExtractBrief}
                        disabled={!canExtractBrief || isBriefLoading}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                            canExtractBrief && !isBriefLoading
                                ? "bg-nx-primary text-white hover:opacity-90 shadow-sm"
                                : "bg-nx-surface-container-high text-nx-on-surface-variant/40 cursor-not-allowed"
                        )}
                        aria-label="Generate pitch brief"
                    >
                        {isBriefLoading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <FileText className="w-3.5 h-3.5" />
                        )}
                        Generate Brief
                        {canExtractBrief && <ChevronRight className="w-3 h-3" />}
                    </button>
                </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
                        {/* Avatar */}
                        <div className={cn(
                            "w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-sm font-bold",
                            msg.role === "assistant"
                                ? "bg-nx-primary-container border border-nx-primary/20"
                                : "bg-nx-surface-container-high border border-nx-outline-variant"
                        )}>
                            {msg.role === "assistant"
                                ? <Sparkles className="w-4 h-4 text-nx-primary" />
                                : "Y"}
                        </div>

                        {/* Bubble */}
                        <div className={cn("max-w-[75%] flex flex-col gap-1", msg.role === "user" ? "items-end" : "items-start")}>
                            <div className={cn(
                                "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                                msg.role === "assistant"
                                    ? "bg-white border border-nx-outline-variant rounded-bl-sm text-nx-on-surface"
                                    : "bg-nx-primary text-white rounded-br-sm"
                            )}>
                                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            <span className="text-[10px] text-nx-on-surface-variant/50 px-1">
                                {format(msg.timestamp, "HH:mm")}
                            </span>
                        </div>
                    </div>
                ))}

                {isThinking && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-nx-primary-container border border-nx-primary/20 shrink-0 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-nx-primary" />
                        </div>
                        <div className="bg-white border border-nx-outline-variant rounded-2xl rounded-bl-sm shadow-sm">
                            <ThinkingDots />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div className="px-4 py-3 border-t border-nx-outline-variant bg-white">
                <div className="flex items-end gap-2 rounded-2xl border border-nx-outline-variant bg-nx-surface-container px-4 py-2.5 focus-within:border-nx-primary focus-within:ring-2 focus-within:ring-nx-primary/10 transition-all">
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={inputValue}
                        onChange={handleTextareaChange}
                        onKeyDown={handleKeyDown}
                        disabled={isThinking}
                        placeholder="Describe your event idea…"
                        className="flex-1 resize-none bg-transparent text-sm text-nx-on-surface placeholder:text-nx-on-surface-variant/50 outline-none leading-relaxed max-h-40 py-0.5"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isThinking}
                        className={cn(
                            "shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200",
                            inputValue.trim() && !isThinking
                                ? "bg-nx-primary text-white hover:opacity-90 shadow-sm"
                                : "bg-nx-surface-container-high text-nx-on-surface-variant/30 cursor-not-allowed"
                        )}
                        aria-label="Send message"
                    >
                        {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                <p className="mt-1.5 text-[10px] text-nx-on-surface-variant/40 text-right">
                    Enter to send · Shift+Enter for newline
                </p>
            </div>

            {/* ── Brief Modal ── */}
            {brief && (
                <PitchBriefModal
                    isOpen={briefModalOpen}
                    onClose={() => setBriefModalOpen(false)}
                    brief={brief}
                    userId={userId}
                    organizationId={organizationId}
                />
            )}
        </div>
    );
}
