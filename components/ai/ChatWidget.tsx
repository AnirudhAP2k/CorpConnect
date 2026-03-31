"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
    MessageCircle, X, Send, Loader2, Sparkles, ChevronDown, Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage, getChatHistory, getExistingSession } from "@/lib/actions/chat";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatContextType = "EVENT" | "ORGANIZATION";

interface Message {
    id: string;
    role: "user" | "assistant";
    content: string;
    sourceDocs?: string[];
    isError?: boolean;
}

interface ChatWidgetProps {
    contextId: string;
    contextType: ChatContextType;
    contextName: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function UserBubble({ content }: { content: string }) {
    return (
        <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-violet-600 px-4 py-2.5 text-sm text-white shadow-sm">
                {content}
            </div>
        </div>
    );
}

function AssistantBubble({ content, sourceDocs, isError }: {
    content: string; sourceDocs?: string[]; isError?: boolean;
}) {
    const [showSources, setShowSources] = useState(false);
    return (
        <div className="flex flex-col gap-1">
            <div className={`flex items-start gap-2`}>
                <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-violet-100 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-violet-600" />
                </div>
                <div className={`max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm shadow-sm leading-relaxed
                    ${isError
                        ? "bg-red-50 border border-red-200 text-red-700"
                        : "bg-white border border-gray-100 text-gray-800"
                    }`}>
                    {content}
                </div>
            </div>
            {sourceDocs && sourceDocs.length > 0 && (
                <div className="ml-8">
                    <button
                        onClick={() => setShowSources(s => !s)}
                        className="text-[10px] text-violet-500 hover:text-violet-700 flex items-center gap-1 transition-colors"
                    >
                        <Sparkles className="h-2.5 w-2.5" />
                        {sourceDocs.length} source{sourceDocs.length > 1 ? "s" : ""}
                        <ChevronDown className={`h-2.5 w-2.5 transition-transform ${showSources ? "rotate-180" : ""}`} />
                    </button>
                    {showSources && (
                        <div className="mt-1 flex flex-wrap gap-1">
                            {sourceDocs.map((doc, i) => (
                                <span key={i} className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-100">
                                    {doc}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TypingIndicator() {
    return (
        <div className="flex items-start gap-2">
            <div className="mt-1 h-6 w-6 shrink-0 rounded-full bg-violet-100 flex items-center justify-center">
                <Bot className="h-3.5 w-3.5 text-violet-600" />
            </div>
            <div className="rounded-2xl rounded-tl-sm bg-white border border-gray-100 px-4 py-3 shadow-sm">
                <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map(i => (
                        <span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export function ChatWidget({ contextId, contextType, contextName }: ChatWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState<string>("new");
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialising, setIsInitialising] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // On open: check for an existing session and load history
    useEffect(() => {
        if (!isOpen || messages.length > 0) return;

        const initChat = async () => {
            setIsInitialising(true);
            const existingId = await getExistingSession(contextId, contextType);
            if (existingId) {
                setSessionId(existingId);
                const result = await getChatHistory(existingId);
                if (result.success && result.data.length > 0) {
                    setMessages(result.data.map(m => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                    })));
                }
            }
            setIsInitialising(false);
        };

        initChat();
    }, [isOpen, contextId, contextType, messages.length]);

    // Focus textarea when panel opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => textareaRef.current?.focus(), 150);
        }
    }, [isOpen]);

    const handleSend = useCallback(async () => {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMsg: Message = {
            id: `tmp-${Date.now()}`,
            role: "user",
            content: trimmed,
        };

        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        const result = await sendChatMessage(contextId, contextType, trimmed, sessionId);

        setIsLoading(false);

        if (result.success) {
            if (sessionId === "new") setSessionId(result.data.sessionId);
            setMessages(prev => [...prev, {
                id: result.data.sessionId + Date.now(),
                role: "assistant",
                content: result.data.reply,
                sourceDocs: result.data.sourceDocs,
            }]);
        } else {
            setMessages(prev => [...prev, {
                id: `err-${Date.now()}`,
                role: "assistant",
                content: result.error,
                isError: true,
            }]);
        }
    }, [input, isLoading, contextId, contextType, sessionId]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const emptyStateHint = contextType === "EVENT"
        ? `Ask me anything about "${contextName}" — schedule, location, pricing, or policies.`
        : `Ask me anything about "${contextName}" — what they do, events they host, or how to connect.`;

    return (
        <>
            {/* Floating Action Button */}
            <button
                id="chat-widget-fab"
                onClick={() => setIsOpen(o => !o)}
                aria-label="Open AI chat"
                className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300
                    ${isOpen
                        ? "bg-gray-700 hover:bg-gray-800 rotate-90"
                        : "bg-violet-600 hover:bg-violet-700 hover:scale-110"
                    }`}
            >
                {isOpen
                    ? <X className="h-5 w-5 text-white" />
                    : <MessageCircle className="h-6 w-6 text-white" />
                }
            </button>

            {/* Chat Panel */}
            <div
                className={`fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl border border-violet-100
                    bg-gray-50 overflow-hidden transition-all duration-300 origin-bottom-right
                    ${isOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"}`}
                style={{ height: "480px" }}
                aria-live="polite"
            >
                {/* ── Header ── */}
                <div className="flex items-center gap-3 px-4 py-3 bg-violet-600 text-white shrink-0">
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold leading-tight truncate">{contextName}</p>
                        <p className="text-[10px] text-violet-200 leading-tight">
                            AI Assistant · {contextType === "EVENT" ? "Event" : "Organization"}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-violet-200 hover:text-white transition-colors ml-auto"
                        aria-label="Close chat"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* ── Messages Area ── */}
                <div className="flex-1 overflow-y-auto px-3 py-4 space-y-4 scroll-smooth">
                    {isInitialising ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
                        </div>
                    ) : messages.length === 0 ? (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                            <div className="h-12 w-12 rounded-full bg-violet-100 flex items-center justify-center">
                                <Sparkles className="h-5 w-5 text-violet-500" />
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">{emptyStateHint}</p>
                            <p className="text-[10px] text-gray-400">
                                Answers are grounded in the actual documents for this {contextType.toLowerCase()}.
                            </p>
                        </div>
                    ) : (
                        messages.map(m =>
                            m.role === "user"
                                ? <UserBubble key={m.id} content={m.content} />
                                : <AssistantBubble key={m.id} content={m.content} sourceDocs={m.sourceDocs} isError={m.isError} />
                        )
                    )}
                    {isLoading && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                </div>

                {/* ── Input Footer ── */}
                <div className="px-3 pb-3 pt-2 border-t border-gray-200 bg-white shrink-0">
                    <div className="flex gap-2 items-end">
                        <Textarea
                            ref={textareaRef}
                            id="chat-input"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask a question… (Enter to send)"
                            rows={2}
                            disabled={isLoading || isInitialising}
                            className="resize-none text-sm rounded-xl border-gray-200 focus:border-violet-400 focus:ring-violet-100"
                        />
                        <Button
                            id="chat-send-btn"
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading || isInitialising}
                            size="icon"
                            className="h-10 w-10 rounded-xl bg-violet-600 hover:bg-violet-700 shrink-0 disabled:opacity-40"
                            aria-label="Send message"
                        >
                            {isLoading
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Send className="h-4 w-4" />
                            }
                        </Button>
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mt-1.5">
                        Powered by RAG · answers grounded in real documents
                    </p>
                </div>
            </div>
        </>
    );
}
