"use client";

import { useState, useRef, useCallback } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
    onSend: (content: string) => void;
    disabled?: boolean;
    placeholder?: string;
}

export function MessageInput({ onSend, disabled, placeholder = "Write a message…" }: MessageInputProps) {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const submit = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue("");
        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }, [value, disabled, onSend]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
        // Auto-grow textarea
        const el = textareaRef.current;
        if (el) {
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
        }
    };

    return (
        <div className="px-4 py-3 border-t border-nx-outline-variant bg-white">
            <div
                className={cn(
                    "flex items-end gap-2 rounded-2xl border border-nx-outline-variant bg-nx-surface-container px-4 py-2.5 transition-all duration-200",
                    "focus-within:border-nx-primary focus-within:ring-2 focus-within:ring-nx-primary/10"
                )}
            >
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    placeholder={placeholder}
                    className="flex-1 resize-none bg-transparent text-sm text-nx-on-surface placeholder:text-nx-on-surface-variant/50 outline-none leading-relaxed max-h-40 py-0.5"
                />
                <button
                    type="button"
                    onClick={submit}
                    disabled={!value.trim() || disabled}
                    className={cn(
                        "shrink-0 w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-200",
                        value.trim() && !disabled
                            ? "bg-nx-primary text-white hover:opacity-90 shadow-nx-primary active:scale-95"
                            : "bg-nx-surface-container-high text-nx-on-surface-variant/30 cursor-not-allowed"
                    )}
                    aria-label="Send message"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
            <p className="mt-1.5 text-[10px] text-nx-on-surface-variant/40 text-right">
                Enter to send · Shift+Enter for newline
            </p>
        </div>
    );
}
