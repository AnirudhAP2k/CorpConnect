"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    Bot, X, Send, Loader2, Sparkles, Command, ShieldCheck, Zap, MessageSquare
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { loadAgentConversation, type AgentToolCallResult } from "@/domain/ai/agent-actions";
import { AgentToolStatus } from "@/components/ai/AgentToolStatus";
import { FormattedMarkdown } from "@/components/shared/FormattedMarkdown";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    toolCalls?: AgentToolCallResult[];
    isError?: boolean;
}

const QUICK_SUGGESTIONS = [
    "What events am I hosting?",
    "Check AI usage quota",
    "Find organizations that match us",
    "Show my organization connections",
    "What meeting requests do I have?",
    "Help me write an event description",
];

export function AgentCopilot() {
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState<string>("new");
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isCooldown, setIsCooldown] = useState(false);
    const [isInitialising, setIsInitialising] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const historyLoadedRef = useRef(false);

    // Keyboard shortcut (Cmd+K or Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                setIsOpen(open => !open);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Scroll to bottom when messages update
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isLoading, isOpen]);

    // On open: resume existing agent session and load persisted messages from DB
    useEffect(() => {
        if (!isOpen || historyLoadedRef.current) return;

        const initSession = async () => {
            setIsInitialising(true);
            try {
                const result = await loadAgentConversation();
                if (!result.success) {
                    console.error("[AgentCopilot] Failed to load conversation:", result.error);
                    return;
                }
                if (result.sessionId) {
                    setSessionId(result.sessionId);
                }
                if (result.messages.length > 0) {
                    setMessages(
                        result.messages.map((m) => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                        }))
                    );
                }
            } catch (err) {
                console.error("[AgentCopilot] Unexpected error loading conversation:", err);
            } finally {
                historyLoadedRef.current = true;
                setIsInitialising(false);
            }
        };

        void initSession();
    }, [isOpen]);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => textareaRef.current?.focus(), 150);
        }
    }, [isOpen]);

    const handleSend = useCallback(async (promptText?: string) => {
        const textToSend = (promptText || input).trim();
        if (!textToSend || isLoading || isCooldown) return;

        const userMsg: Message = {
            id: `user-${Date.now()}`,
            role: "user",
            content: textToSend,
        };

        const assistantMsgId = `agent-${Date.now()}`;
        const assistantMsg: Message = {
            id: assistantMsgId,
            role: "assistant",
            content: "",
            toolCalls: [],
        };

        setMessages(prev => [...prev, userMsg, assistantMsg]);
        if (!promptText) setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/agent/stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message: textToSend, sessionId }),
            });

            if (!response.ok || !response.body) {
                const errData = await response.json().catch(() => ({ error: "Failed to connect to agent stream." }));
                setMessages(prev =>
                    prev.map(m =>
                        m.id === assistantMsgId
                            ? { ...m, content: errData.error || "An error occurred.", isError: true }
                            : m
                    )
                );
                setIsLoading(false);
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith("data: ")) continue;

                    try {
                        const payload = JSON.parse(trimmed.replace(/^data:\s*/, ""));

                        if (payload.type === "session") {
                            setSessionId(payload.sessionId);
                        } else if (payload.type === "token") {
                            setMessages(prev =>
                                prev.map(m =>
                                    m.id === assistantMsgId
                                        ? { ...m, content: m.content + payload.content }
                                        : m
                                )
                            );
                        } else if (payload.type === "tool_start") {
                            setMessages(prev =>
                                prev.map(m =>
                                    m.id === assistantMsgId
                                        ? {
                                            ...m,
                                            toolCalls: [
                                                ...(m.toolCalls || []),
                                                {
                                                    toolName: payload.toolName,
                                                    status: "executing",
                                                },
                                            ],
                                        }
                                        : m
                                )
                            );
                        } else if (payload.type === "tool_end") {
                            setMessages(prev =>
                                prev.map(m =>
                                    m.id === assistantMsgId
                                        ? {
                                            ...m,
                                            toolCalls: (m.toolCalls || []).map(tc =>
                                                tc.toolName === payload.toolName
                                                    ? {
                                                        ...tc,
                                                        status: payload.status,
                                                        result: payload.result,
                                                        error: payload.error,
                                                    }
                                                    : tc
                                            ),
                                        }
                                        : m
                                )
                            );
                        }
                    } catch {
                        // Skip malformed SSE lines
                    }
                }
            }
        } catch {
            setMessages(prev =>
                prev.map(m =>
                    m.id === assistantMsgId
                        ? { ...m, content: "Network error occurred while streaming response.", isError: true }
                        : m
                )
            );
        } finally {
            setIsLoading(false);
            setIsCooldown(true);
            setTimeout(() => setIsCooldown(false), 2000);
        }
    }, [input, isLoading, isCooldown, sessionId]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Agent Copilot Button */}
            <button
                id="agent-copilot-trigger"
                onClick={() => setIsOpen(o => !o)}
                aria-label="Open AI Agent Copilot"
                className={`fixed bottom-6 right-24 z-50 h-12 px-4 rounded-full shadow-lg flex items-center gap-2.5 transition-all duration-300 font-medium text-xs text-white
                    ${isOpen
                        ? "bg-gray-800 hover:bg-gray-900 shadow-xl"
                        : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 hover:scale-105"
                    }`}
            >
                <Bot className="h-4 w-4 animate-pulse" />
                <span>AI Copilot</span>
                <span className="hidden sm:inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] bg-white/20 font-mono">
                    <Command className="h-2.5 w-2.5" />K
                </span>
            </button>

            {/* Copilot Drawer Panel */}
            <div
                className={`fixed bottom-22 right-6 z-50 w-88 sm:w-[420px] flex flex-col rounded-2xl shadow-2xl border border-violet-200/80
                    bg-white overflow-hidden transition-all duration-300 origin-bottom-right
                    ${isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
                style={{ height: "540px" }}
                aria-live="polite"
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-700 via-violet-600 to-indigo-600 text-white shrink-0 shadow-sm">
                    <div className="h-9 w-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <Zap className="h-4 w-4 text-amber-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold truncate">CorpConnect AI Agent</p>
                            <span className="text-[10px] bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.2 rounded-full font-mono">
                                v2
                            </span>
                        </div>
                        <p className="text-[11px] text-violet-200 truncate flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3 text-emerald-300" /> Real-time Streaming Agent
                        </p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-violet-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                        aria-label="Close Agent Copilot"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/50">
                    {isInitialising ? (
                        <div className="flex flex-col items-center justify-center h-full gap-2 text-xs text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                            <span>Loading conversation…</span>
                        </div>
                    ) : messages.length === 0 ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-2 py-6">
                            <div className="h-14 w-14 rounded-2xl bg-violet-100 flex items-center justify-center border border-violet-200 shadow-inner">
                                <Sparkles className="h-7 w-7 text-violet-600" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-gray-800">What can I do for you today?</h4>
                                <p className="text-xs text-gray-500 mt-1 max-w-[280px]">
                                    I can fetch information, create events, update schedules, and search platform data on your behalf.
                                </p>
                            </div>

                            {/* Suggestion Chips */}
                            <div className="w-full space-y-1.5 pt-2">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400 text-left">
                                    Suggested Actions
                                </p>
                                {QUICK_SUGGESTIONS.map((chip, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(chip)}
                                        className="w-full text-left text-xs bg-white hover:bg-violet-50 text-gray-700 hover:text-violet-700 px-3 py-2 rounded-xl border border-gray-200 hover:border-violet-300 transition-all shadow-xs flex items-center justify-between"
                                    >
                                        <span>{chip}</span>
                                        <MessageSquare className="h-3 w-3 opacity-40" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        messages.map(m => (
                            <div key={m.id} className="space-y-1.5">
                                {m.role === "user" ? (
                                    <div className="flex justify-end">
                                        <div className="max-w-[82%] rounded-2xl rounded-tr-xs bg-violet-600 px-4 py-2.5 text-xs text-white shadow-sm leading-relaxed">
                                            {m.content}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-start gap-2">
                                            <div className="mt-0.5 h-6 w-6 shrink-0 rounded-lg bg-violet-100 flex items-center justify-center border border-violet-200">
                                                <Bot className="h-3.5 w-3.5 text-violet-600" />
                                            </div>
                                            <div className={`max-w-[86%] rounded-2xl rounded-tl-xs px-4 py-2.5 text-xs shadow-xs leading-relaxed ${m.isError
                                                ? "bg-red-50 border border-red-200 text-red-700"
                                                : "bg-white border border-gray-200/80 text-gray-800"
                                                }`}>
                                                {m.content ? (
                                                    <FormattedMarkdown content={m.content} />
                                                ) : isLoading && !m.toolCalls?.length ? (
                                                    "..."
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Tool Status Badges */}
                                        {m.toolCalls && m.toolCalls.length > 0 && (
                                            <div className="ml-8">
                                                <AgentToolStatus toolCalls={m.toolCalls} />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}

                    {isLoading && !messages.some(m => m.role === "assistant" && (m.content || m.toolCalls?.length)) && (
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 shrink-0 rounded-lg bg-violet-100 flex items-center justify-center border border-violet-200">
                                <Bot className="h-3.5 w-3.5 text-violet-600" />
                            </div>
                            <div className="rounded-2xl rounded-tl-xs bg-white border border-gray-200 px-4 py-2.5 shadow-xs flex items-center gap-2 text-xs text-gray-500">
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600" />
                                <span>Agent thinking & executing tools…</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Footer Input */}
                <div className="px-3 pb-3 pt-2 border-t border-gray-200 bg-white shrink-0">
                    <div className="flex gap-2 items-end">
                        <Textarea
                            ref={textareaRef}
                            id="agent-copilot-input"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isCooldown ? "Please wait a moment..." : "Instruct the agent… (Enter to send)"}
                            rows={2}
                            disabled={isLoading || isCooldown}
                            className="resize-none text-xs rounded-xl border-gray-200 focus:border-violet-500 focus:ring-violet-100 disabled:bg-gray-50"
                        />
                        <Button
                            id="agent-copilot-send"
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading || isCooldown}
                            size="icon"
                            className="h-10 w-10 rounded-xl bg-violet-600 hover:bg-violet-700 shrink-0 disabled:opacity-40"
                            aria-label="Send instruction"
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-1.5 flex items-center justify-center gap-1">
                        {isCooldown ? (
                            <span className="text-amber-600 font-medium">⏳ Cooldown active to prevent API rate limits…</span>
                        ) : (
                            <>
                                <span>Streaming ReAct Agent</span> · <span>Groq Llama-3.3 70B</span>
                            </>
                        )}
                    </p>
                </div>
            </div>
        </>
    );
}
