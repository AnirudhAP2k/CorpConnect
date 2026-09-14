"use client";

import { useState, KeyboardEvent, useRef } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TagArrayInputProps {
    value: string[];
    onChange: (val: string[]) => void;
    placeholder?: string;
    maxItems?: number;
    disabled?: boolean;
}

/**
 * Free-text tag chip input for string arrays (services, technologies, partnershipInterests).
 * Type a value then press Enter or comma to add. Click × to remove.
 */
export default function TagArrayInput({
    value,
    onChange,
    placeholder = "Type and press Enter…",
    maxItems = 20,
    disabled = false,
}: TagArrayInputProps) {
    const [inputVal, setInputVal] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (raw: string) => {
        const tag = raw.trim();
        if (!tag || value.includes(tag) || value.length >= maxItems) return;
        onChange([...value, tag]);
        setInputVal("");
    };

    const removeTag = (tag: string) => {
        onChange(value.filter((t) => t !== tag));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(inputVal);
        } else if (e.key === "Backspace" && !inputVal && value.length > 0) {
            removeTag(value[value.length - 1]);
        }
    };

    return (
        <div
            className={`flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-xl border border-nx-outline-variant bg-nx-surface-container-low px-3 py-2 font-body text-nx-on-surface ${disabled ? "opacity-50 pointer-events-none" : ""}`}
            onClick={() => inputRef.current?.focus()}
        >
            {value.map((tag) => (
                <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full border border-nx-primary/20 bg-nx-primary-container/30 px-2.5 py-0.5 font-label text-xs font-medium text-nx-primary"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                        className="transition-colors hover:text-nx-error"
                        aria-label={`Remove ${tag}`}
                    >
                        <X className="w-3 h-3" />
                    </button>
                </span>
            ))}
            {value.length < maxItems && (
                <Input
                    ref={inputRef}
                    value={inputVal}
                    onChange={(e) => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => addTag(inputVal)}
                    placeholder={value.length === 0 ? placeholder : ""}
                    disabled={disabled}
                    className="h-auto min-w-[140px] flex-1 border-0 bg-transparent p-0 text-sm text-nx-on-surface shadow-none placeholder:text-nx-on-surface-variant/60 focus-visible:ring-0"
                />
            )}
            {value.length >= maxItems && (
                <span className="text-xs text-nx-on-surface-variant/70">Max {maxItems} reached</span>
            )}
        </div>
    );
}
