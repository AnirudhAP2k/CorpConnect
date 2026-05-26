"use client";

import { useState } from "react";
import { Bell, Loader2, X, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendCustomNotificationAction } from "@/actions/admin.actions";

interface AdminSendNotificationButtonProps {
    userId: string;
    userName: string;
}

export function AdminSendNotificationButton({ userId, userName }: AdminSendNotificationButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [type, setType] = useState<"SYSTEM" | "VERIFICATION" | "INVITE" | "MEETING" | "PAYMENT">("SYSTEM");
    const [link, setLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError("Title is required.");
            return;
        }
        if (!description.trim()) {
            setError("Description is required.");
            return;
        }

        setLoading(true);
        setError("");
        setSuccess("");

        try {
            const res = await sendCustomNotificationAction({
                userId,
                title,
                type,
                description,
                link: link.trim() || undefined,
            });

            if (res.success) {
                setSuccess("Notification sent successfully!");
                setTimeout(() => {
                    setIsOpen(false);
                    // Reset fields
                    setTitle("");
                    setDescription("");
                    setType("SYSTEM");
                    setLink("");
                    setSuccess("");
                }, 2000);
            } else {
                setError(res.error || "Failed to send notification.");
            }
        } catch (err: any) {
            setError(err?.message || "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                title={`Send notification to ${userName}`}
                onClick={() => setIsOpen(true)}
            >
                <Bell className="h-4 w-4" />
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => !loading && setIsOpen(false)}
                    />
                    
                    {/* Modal container */}
                    <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all border border-gray-100/50 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-indigo-50 rounded-xl">
                                    <Bell className="h-4 w-4 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 text-sm">Send Notification</h3>
                                    <p className="text-xs text-muted-foreground">To: <span className="font-medium text-gray-700">{userName}</span></p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-50 transition-colors"
                                disabled={loading}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Notification Title</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Profile Verification Complete"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border-gray-200"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            {/* Type & Optional Link Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                                    <select
                                        value={type}
                                        onChange={(e) => setType(e.target.value as any)}
                                        className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border-gray-200 bg-white"
                                        disabled={loading}
                                    >
                                        <option value="SYSTEM">System</option>
                                        <option value="VERIFICATION">Verification</option>
                                        <option value="INVITE">Invite</option>
                                        <option value="MEETING">Meeting</option>
                                        <option value="PAYMENT">Payment</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1">Redirect Link (optional)</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. /dashboard"
                                        value={link}
                                        onChange={(e) => setLink(e.target.value)}
                                        className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border-gray-200"
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Message Description</label>
                                <textarea
                                    placeholder="Enter your notification message here..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 text-xs border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border-gray-200 resize-none"
                                    disabled={loading}
                                    required
                                />
                            </div>

                            {/* Alert/Status messages */}
                            {error && (
                                <div className="text-[11px] text-red-500 bg-red-50 rounded-xl p-3 flex items-start gap-2 border border-red-100/50">
                                    <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                                    <span>{error}</span>
                                </div>
                            )}

                            {success && (
                                <div className="text-[11px] text-emerald-600 bg-emerald-50 rounded-xl p-3 border border-emerald-100/50 font-medium">
                                    ✓ {success}
                                </div>
                            )}

                            {/* Buttons */}
                            <div className="flex justify-end gap-2 border-t border-gray-50 pt-3">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-gray-500 hover:bg-gray-50"
                                    onClick={() => setIsOpen(false)}
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                                    ) : (
                                        <><Send className="h-3 w-3" /> Send</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
