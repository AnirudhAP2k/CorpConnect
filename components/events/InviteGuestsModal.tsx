"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { sendEventInvitesAction } from "@/domain/events";
import { toast } from "sonner";

// ─── Props ────────────────────────────────────────────────────────────────────

interface InviteGuestsModalProps {
    eventId: string;
    eventTitle: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function InviteGuestsModal({ eventId, eventTitle }: InviteGuestsModalProps) {
    const [open, setOpen] = useState(false);
    const [emailInput, setEmailInput] = useState("");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const handleSubmit = () => {
        setResult(null);

        // Parse comma/newline/semicolon-separated emails
        const emails = emailInput
            .split(/[,;\n]+/)
            .map((e) => e.trim().toLowerCase())
            .filter((e) => e.length > 0);

        if (emails.length === 0) {
            setResult({ type: "error", message: "Please enter at least one email address." });
            return;
        }

        // Basic client-side validation
        const invalidEmails = emails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
        if (invalidEmails.length > 0) {
            setResult({
                type: "error",
                message: `Invalid email address(es): ${invalidEmails.join(", ")}`,
            });
            return;
        }

        if (emails.length > 50) {
            setResult({ type: "error", message: "Cannot invite more than 50 people at once." });
            return;
        }

        startTransition(async () => {
            const response = await sendEventInvitesAction({ eventId, emails });

            if (response.error) {
                setResult({ type: "error", message: response.error });
            } else {
                setResult({ type: "success", message: response.message || "Invitations sent!" });
                toast.success(response.message || "Invitations sent!");
                setEmailInput("");
            }
        });
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            setResult(null);
            setEmailInput("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="w-full gap-2"
                    id="invite-guests-button"
                >
                    <Mail className="w-4 h-4" />
                    Invite Guests
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Mail className="w-5 h-5 text-primary-600" />
                        Invite External Guests
                    </DialogTitle>
                    <DialogDescription>
                        Invite people to <strong>{eventTitle}</strong>. They&apos;ll receive an
                        email with a link to register and join the event.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="invite-emails">
                            Email Addresses
                        </Label>
                        <Textarea
                            id="invite-emails"
                            placeholder="Enter email addresses separated by commas, semicolons, or new lines&#10;&#10;e.g. john@company.com, jane@startup.io"
                            value={emailInput}
                            onChange={(e) => {
                                setEmailInput(e.target.value);
                                setResult(null);
                            }}
                            rows={5}
                            disabled={isPending}
                            className="resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            Maximum 50 emails per batch. Invitations expire after 7 days.
                        </p>
                    </div>

                    {/* Result feedback */}
                    {result && (
                        <div
                            className={`flex items-start gap-2 rounded-md p-3 text-sm ${
                                result.type === "success"
                                    ? "bg-green-50 text-green-800 border border-green-200"
                                    : "bg-red-50 text-red-800 border border-red-200"
                            }`}
                        >
                            {result.type === "success" ? (
                                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            ) : (
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            )}
                            <span>{result.message}</span>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => handleOpenChange(false)}
                        disabled={isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isPending || emailInput.trim().length === 0}
                        id="send-invites-button"
                    >
                        {isPending ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            "Send Invitations"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
