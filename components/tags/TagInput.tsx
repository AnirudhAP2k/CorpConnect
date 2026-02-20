"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Plus, Tag } from "lucide-react";

interface TagOption {
    id: string;
    label: string;
}

interface TagInputProps {
    value: string[];          // array of tag labels currently selected
    onChange: (tags: string[]) => void;
    placeholder?: string;
    maxTags?: number;
    disabled?: boolean;
}

/**
 * TagInput — autocomplete tag input with keyboard navigation.
 *
 * - Searches /api/tags?q= for suggestions
 * - Creates new tags inline (comma / Enter to confirm)
 * - Displays selected tags as removable chips
 */
export function TagInput({
    value,
    onChange,
    placeholder = "Add tags...",
    maxTags = 10,
    disabled = false,
}: TagInputProps) {
    const [input, setInput] = useState("");
    const [suggestions, setSuggestions] = useState<TagOption[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [loading, setLoading] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    // Fetch suggestions from API
    const fetchSuggestions = useCallback(async (query: string) => {
        if (!query.trim()) { setSuggestions([]); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/tags?q=${encodeURIComponent(query)}`);
            const data: TagOption[] = await res.json();
            // Filter out already-selected tags
            setSuggestions(data.filter((t) => !value.includes(t.label)));
        } catch {
            setSuggestions([]);
        } finally {
            setLoading(false);
        }
    }, [value]);

    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => fetchSuggestions(input), 200);
        return () => clearTimeout(debounceRef.current);
    }, [input, fetchSuggestions]);

    const addTag = (label: string) => {
        const normalised = label.trim().toLowerCase().replace(/\s+/g, "-");
        if (!normalised || value.includes(normalised) || value.length >= maxTags) return;
        onChange([...value, normalised]);
        setInput("");
        setSuggestions([]);
        setShowDropdown(false);
        setActiveIndex(-1);
        inputRef.current?.focus();
    };

    const removeTag = (label: string) => {
        onChange(value.filter((t) => t !== label));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            if (activeIndex >= 0 && suggestions[activeIndex]) {
                addTag(suggestions[activeIndex].label);
            } else if (input.trim()) {
                addTag(input);
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === "Backspace" && !input && value.length > 0) {
            removeTag(value[value.length - 1]);
        } else if (e.key === "Escape") {
            setShowDropdown(false);
        }
    };

    return (
        <div className="tag-input-wrapper">
            {/* Selected tag chips */}
            <div className="tag-chips">
                {value.map((tag) => (
                    <span key={tag} className="tag-chip">
                        <Tag size={10} />
                        {tag}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => removeTag(tag)}
                                className="tag-chip-remove"
                                aria-label={`Remove tag ${tag}`}
                            >
                                <X size={10} />
                            </button>
                        )}
                    </span>
                ))}

                {/* Input */}
                {!disabled && value.length < maxTags && (
                    <div className="tag-input-container">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => {
                                setInput(e.target.value);
                                setShowDropdown(true);
                                setActiveIndex(-1);
                            }}
                            onFocus={() => setShowDropdown(true)}
                            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                            onKeyDown={handleKeyDown}
                            placeholder={value.length === 0 ? placeholder : ""}
                            className="tag-input"
                        />
                        {/* Dropdown suggestions */}
                        {showDropdown && (input.trim() || suggestions.length > 0) && (
                            <div className="tag-dropdown">
                                {loading && (
                                    <div className="tag-dropdown-item tag-dropdown-loading">
                                        Searching...
                                    </div>
                                )}
                                {suggestions.map((s, i) => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        className={`tag-dropdown-item ${i === activeIndex ? "tag-dropdown-item--active" : ""}`}
                                        onMouseDown={() => addTag(s.label)}
                                    >
                                        <Tag size={12} />
                                        {s.label}
                                    </button>
                                ))}
                                {input.trim() && !suggestions.find((s) => s.label === input.trim().toLowerCase()) && (
                                    <button
                                        type="button"
                                        className="tag-dropdown-item tag-dropdown-create"
                                        onMouseDown={() => addTag(input)}
                                    >
                                        <Plus size={12} />
                                        Create &ldquo;{input.trim()}&rdquo;
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
