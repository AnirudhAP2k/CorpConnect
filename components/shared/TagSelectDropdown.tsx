"use client";

import { useState, useRef, useEffect } from "react";
import { X, Check, ChevronDown, Search, Tag as TagIcon } from "lucide-react";

export interface TagOption {
    id: string;
    label: string;
}

interface TagSelectDropdownProps {
    value: string[]; // Array of selected tag labels
    onChange: (val: string[]) => void;
    availableTags?: TagOption[];
    placeholder?: string;
    maxItems?: number;
    disabled?: boolean;
}

export default function TagSelectDropdown({
    value = [],
    onChange,
    availableTags = [],
    placeholder = "Select tags from dropdown…",
    maxItems = 10,
    disabled = false,
}: TagSelectDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredTags = availableTags.filter((tag) =>
        tag.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const toggleTag = (tagLabel: string) => {
        if (value.includes(tagLabel)) {
            onChange(value.filter((t) => t !== tagLabel));
        } else {
            if (value.length >= maxItems) return;
            onChange([...value, tagLabel]);
        }
    };

    const removeTag = (tagLabel: string) => {
        onChange(value.filter((t) => t !== tagLabel));
    };

    return (
        <div ref={containerRef} className="relative space-y-2">
            {/* Dropdown Trigger Button */}
            <button
                type="button"
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                disabled={disabled}
                className={`w-full h-10 px-3 flex items-center justify-between rounded-md border border-input bg-background text-xs font-normal text-gray-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${
                    disabled ? "opacity-50 pointer-events-none" : ""
                }`}
            >
                <div className="flex items-center gap-2 truncate">
                    <TagIcon className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                    <span className={value.length === 0 ? "text-muted-foreground" : "font-medium text-gray-900"}>
                        {value.length === 0 ? placeholder : `${value.length} tag(s) selected`}
                    </span>
                </div>
                <ChevronDown className={`h-4 w-4 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-80">
                    <div className="p-2 border-b border-gray-100 flex items-center gap-2 bg-slate-50/50">
                        <Search className="h-3.5 w-3.5 text-gray-400 shrink-0 ml-1" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter pre-seeded tags…"
                            className="w-full bg-transparent text-xs outline-none placeholder:text-gray-400"
                            autoFocus
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="text-gray-400 hover:text-gray-600 p-0.5"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    <div className="max-h-56 overflow-y-auto p-1 space-y-0.5">
                        {filteredTags.length === 0 ? (
                            <div className="py-3 text-center text-xs text-gray-400">
                                No matching tags found.
                            </div>
                        ) : (
                            filteredTags.map((tag) => {
                                const isSelected = value.includes(tag.label);
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleTag(tag.label)}
                                        className={`w-full text-left px-3 py-2 rounded-sm text-xs flex items-center justify-between transition-colors ${
                                            isSelected
                                                ? "bg-violet-50 text-violet-900 font-medium"
                                                : "hover:bg-slate-100 text-gray-700"
                                        }`}
                                    >
                                        <span className="truncate">{tag.label}</span>
                                        {isSelected && <Check className="h-3.5 w-3.5 text-violet-600 shrink-0 ml-2" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Selected Tag Badges */}
            {value.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {value.map((tagLabel) => (
                        <span
                            key={tagLabel}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-100/70 text-violet-800 border border-violet-200 shadow-2xs"
                        >
                            {tagLabel}
                            <button
                                type="button"
                                onClick={() => removeTag(tagLabel)}
                                disabled={disabled}
                                className="text-violet-500 hover:text-violet-900 rounded-full p-0.5 transition-colors"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}
