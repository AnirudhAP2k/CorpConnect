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
            className={`min-h-[42px] flex flex-wrap gap-1.5 items-center px-3 py-2 border border-input rounded-md bg-background cursor-text ${disabled ? "opacity-50 pointer-events-none" : ""}`}
            onClick={() => inputRef.current?.focus()}
        >
            {value.map((tag) => (
                <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                        className="hover:text-destructive transition-colors"
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
                    className="border-0 shadow-none p-0 h-auto flex-1 min-w-[140px] focus-visible:ring-0 text-sm"
                />
            )}
            {value.length >= maxItems && (
                <span className="text-xs text-gray-400">Max {maxItems} reached</span>
            )}
        </div>
    );
}
