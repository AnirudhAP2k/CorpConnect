"use client";

import { Bell } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export interface ReminderItem {
    id: string;
    type: "VERIFICATION" | "INVITE" | "SYSTEM" | "MEETING" | "PAYMENT" | string;
    title: string;
    description: string;
    link: string;
    date: Date;
    read: boolean;
    isDbRecord?: boolean;
}

interface NotificationBellProps {
    reminders: ReminderItem[];
}

export function NotificationBell({ reminders: initialReminders }: NotificationBellProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [reminders, setReminders] = useState<ReminderItem[]>(initialReminders);
    const dropRef = useRef<HTMLDivElement>(null);

    const unreadCount = reminders.filter(r => !r.read).length;

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none"
                aria-label="Notifications"
            >
                <Bell className="w-5 h-5 text-gray-700" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                        <h3 className="font-semibold text-gray-800">Notifications</h3>
                        {unreadCount > 0 && (
                            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full font-medium">
                                {unreadCount} new
                            </span>
                        )}
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto">
                        {reminders.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                <p className="text-sm">You're all caught up!</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {reminders.map((reminder) => (
                                    <Link
                                        key={reminder.id}
                                        href={reminder.link}
                                        onClick={async () => {
                                            setIsOpen(false);
                                            // Optimistic clear if DB record
                                            if (reminder.id.startsWith("db-")) {
                                                setReminders(prev => prev.map(r => r.id === reminder.id ? { ...r, read: true } : r));
                                                try {
                                                    const { markNotificationAsRead } = await import("@/actions/notifications.actions");
                                                    await markNotificationAsRead(reminder.id.replace("db-", ""));
                                                } catch (e) { }
                                            }
                                        }}
                                        className="block p-4 hover:bg-gray-50 transition-colors group relative"
                                    >
                                        {!reminder.read && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
                                        )}
                                        <div className="flex gap-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-gray-900 truncate">
                                                    {reminder.title}
                                                </p>
                                                <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
                                                    {reminder.description}
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-2 font-medium uppercase tracking-wider">
                                                    {formatDistanceToNow(reminder.date, { addSuffix: true })}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                    {reminders.length > 0 && (
                        <div className="p-2 border-t border-gray-100 bg-gray-50">
                            <button className="w-full py-1.5 text-xs text-gray-500 font-medium hover:text-gray-800 transition-colors">
                                View all activity
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
