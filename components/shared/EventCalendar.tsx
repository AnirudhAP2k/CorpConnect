"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Calendar as CalendarIcon,
    MapPin,
    Building2,
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    Info,
    X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    getDay,
    isSameDay,
    isToday,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
} from "date-fns";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface CalendarEvent {
    id: string;
    title: string;
    startDateTime: Date | string;
    location: string;
    image: string | null;
    category: string;
    organizerName?: string;
    sharedByName?: string;
}

interface EventCalendarProps {
    events: CalendarEvent[];
    className?: string;
    /**
     * Optional custom footer renderer for each event card in the sidebar
     */
    renderEventFooter?: (event: CalendarEvent) => React.ReactNode;
}

export default function EventCalendar({
    events,
    className = "",
    renderEventFooter,
}: EventCalendarProps) {
    // ─── Calendar States ──────────────────────────────────────────────────────
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

    // ─── Helper functions for calendar grid generation ────────────────────────
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => {
        setCurrentMonth(new Date());
        setSelectedDate(new Date());
    };

    // Helper to get events for a specific day
    const getEventsForDay = (day: Date) => {
        return events.filter((e) => isSameDay(new Date(e.startDateTime), day));
    };

    // Filter events to display in the list
    const displayedEvents = selectedDate
        ? events.filter((e) => isSameDay(new Date(e.startDateTime), selectedDate))
        : events;

    const weekdayHeaders = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-start ${className}`}>
            
            {/* 1. Left Side: The Interactive Calendar Grid (span 7) */}
            <div className="lg:col-span-7 bg-card border rounded-xl shadow-sm overflow-hidden">
                {/* Calendar Header Controls */}
                <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight">
                            {format(currentMonth, "MMMM yyyy")}
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {events.length} event{events.length !== 1 ? "s" : ""} on calendar
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={prevMonth}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold"
                            onClick={goToToday}
                        >
                            Today
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={nextMonth}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 gap-px border-b bg-muted/40 text-center font-medium text-xs text-muted-foreground py-2">
                    {weekdayHeaders.map((day) => (
                        <div key={day}>{day}</div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-px bg-muted/30">
                    {days.map((day, idx) => {
                        const isCurrentMonth = isSameDay(startOfMonth(day), monthStart);
                        const dayEvents = getEventsForDay(day);
                        const isSel = selectedDate ? isSameDay(day, selectedDate) : false;
                        const isTdy = isToday(day);

                        return (
                            <button
                                key={idx}
                                type="button"
                                onClick={() => setSelectedDate(isSel ? null : day)}
                                onMouseEnter={() => setHoveredDate(day)}
                                onMouseLeave={() => setHoveredDate(null)}
                                className={`relative min-h-[85px] p-2 flex flex-col items-start justify-between border-b border-r bg-background transition-all hover:bg-muted/10 text-left outline-none ${
                                    !isCurrentMonth ? "opacity-35" : ""
                                } ${
                                    isSel
                                        ? "ring-2 ring-primary ring-inset bg-primary/5 hover:bg-primary/5"
                                        : ""
                                }`}
                            >
                                {/* Date Number Badge */}
                                <span
                                    className={`text-sm font-semibold rounded-full flex items-center justify-center w-6 h-6 ${
                                        isTdy
                                            ? "bg-primary text-primary-foreground shadow-sm"
                                            : "text-foreground"
                                    }`}
                                >
                                    {format(day, "d")}
                                </span>

                                {/* Event Dots/Indicators */}
                                {dayEvents.length > 0 && (
                                    <div className="w-full mt-2">
                                        {/* Small Event Preview Pill */}
                                        <div className="hidden sm:block truncate text-[10px] font-semibold bg-primary/10 text-primary rounded px-1 py-0.5 border border-primary/20">
                                            {dayEvents[0].title}
                                        </div>
                                        {dayEvents.length > 1 && (
                                            <div className="hidden sm:block text-[9px] text-muted-foreground mt-0.5 pl-1">
                                                +{dayEvents.length - 1} more
                                            </div>
                                        )}
                                        {/* Mobile dots */}
                                        <div className="flex gap-1 sm:hidden mt-1">
                                            {dayEvents.slice(0, 3).map((_, i) => (
                                                <span
                                                    key={i}
                                                    className="w-1.5 h-1.5 rounded-full bg-primary"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Hover Event Details Popover */}
                                {hoveredDate &&
                                    isSameDay(day, hoveredDate) &&
                                    dayEvents.length > 0 && (
                                        <div
                                            className={`absolute z-50 bottom-full mb-2 bg-popover text-popover-foreground border shadow-xl rounded-xl p-3.5 w-72 text-left pointer-events-none transition-all duration-200 animate-in fade-in-0 zoom-in-95 ${
                                                getDay(day) > 4 ? "right-0" : "left-0"
                                            }`}
                                        >
                                            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-muted">
                                                <Info className="w-4 h-4 text-primary" />
                                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                    {format(day, "eeee, MMMM dd")}
                                                </span>
                                            </div>
                                            <div className="space-y-3">
                                                {dayEvents.slice(0, 3).map((e) => (
                                                    <div key={e.id} className="space-y-1">
                                                        <div className="text-xs font-bold text-primary">
                                                            {e.category}
                                                        </div>
                                                        <div className="text-sm font-semibold line-clamp-2">
                                                            {e.title}
                                                        </div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            📍 {e.location}
                                                        </div>
                                                        {e.sharedByName && (
                                                            <div className="text-[10px] text-muted-foreground italic">
                                                                Shared by: {e.sharedByName}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <div className="text-[11px] text-center text-primary font-semibold pt-1 border-t border-muted/50">
                                                        + {dayEvents.length - 3} more event
                                                        {dayEvents.length - 3 !== 1 ? "s" : ""}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Right Side: Shared Events Sidebar List (span 5) */}
            <div className="lg:col-span-5 space-y-4">
                {/* Header with state/filter details */}
                <div className="bg-card border rounded-xl p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <h3 className="font-bold text-lg">
                            {selectedDate
                                ? `Events on ${format(selectedDate, "MMM dd, yyyy")}`
                                : "All Events"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Showing {displayedEvents.length} event
                            {displayedEvents.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                    {selectedDate && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDate(null)}
                            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground font-semibold"
                        >
                            Clear
                            <X className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>

                {/* Grid list of events */}
                {displayedEvents.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl bg-card">
                        <CalendarIcon className="w-8 h-8 opacity-40 mx-auto mb-2 text-primary" />
                        <p className="text-sm font-semibold">No events scheduled.</p>
                        {selectedDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Try selecting another date or clear the filter.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                        {displayedEvents.map((e) => (
                            <div
                                key={e.id}
                                className="bg-card rounded-xl border overflow-hidden flex flex-col sm:flex-row transition-all hover:shadow-md hover:border-primary/45"
                            >
                                {/* Event Image / Thumbnail */}
                                <div className="w-full sm:w-32 h-24 bg-muted relative shrink-0">
                                    {e.image ? (
                                        <Image
                                            src={e.image}
                                            alt={e.title}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/5">
                                            <CalendarIcon className="w-6 h-6 text-primary/30" />
                                        </div>
                                    )}
                                </div>

                                {/* Content Area */}
                                <div className="p-3.5 flex flex-col flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <Badge variant="outline" className="text-[10px] py-0">
                                            {e.category}
                                        </Badge>
                                        <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                                            {format(
                                                new Date(e.startDateTime),
                                                "MMM dd, hh:mm a"
                                            )}
                                        </span>
                                    </div>
                                    
                                    <h4 className="font-bold text-sm truncate mb-1">
                                        {e.title}
                                    </h4>

                                    <div className="space-y-0.5 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3 shrink-0 text-primary/70" />
                                            <span className="truncate">{e.location}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Building2 className="w-3 h-3 shrink-0 text-primary/70" />
                                            <span className="truncate">
                                                {e.organizerName || "Independent Organizer"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Custom or default card footer */}
                                    <div className="mt-2.5 pt-2 border-t flex items-center justify-between">
                                        {renderEventFooter ? (
                                            renderEventFooter(e)
                                        ) : (
                                            <>
                                                {e.sharedByName ? (
                                                    <p className="text-[10px] text-muted-foreground font-semibold truncate max-w-[150px]">
                                                        Shared by: {e.sharedByName}
                                                    </p>
                                                ) : (
                                                    <span />
                                                )}
                                                <Link
                                                    href={`/events/${e.id}`}
                                                    className="text-primary text-xs font-bold hover:underline flex items-center gap-0.5 shrink-0"
                                                >
                                                    Details
                                                    <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
