"use client";

import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { UserPlus, Check, Clock, X, Handshake } from "lucide-react";
import { useRouter } from "next/navigation";

type ConnectionStatus = "NONE" | "PENDING_SENT" | "PENDING_RECEIVED" | "ACCEPTED" | "DECLINED" | "WITHDRAWN" | "NO_ACTIVE_ORG";

interface ConnectButtonProps {
    /** The target org being viewed */
    targetOrgId: string;
    targetOrgName: string;
    /** The calling user's active org id (null if they have no active org) */
    activeOrgId: string | null;
    /** Initial connection state passed from the server */
    initialStatus: ConnectionStatus;
    /** Connection ID (if one exists already) */
    connectionId?: string;
}

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; icon: React.ElementType; variant: "default" | "outline" | "secondary" | "ghost"; disabled?: boolean }> = {
    NONE: { label: "Connect", icon: UserPlus, variant: "default" },
    PENDING_SENT: { label: "Request Sent", icon: Clock, variant: "outline", disabled: true },
    PENDING_RECEIVED: { label: "Respond to Request", icon: Handshake, variant: "default" },
    ACCEPTED: { label: "Connected", icon: Check, variant: "secondary", disabled: true },
    DECLINED: { label: "Connect Again", icon: UserPlus, variant: "outline" },
    WITHDRAWN: { label: "Connect Again", icon: UserPlus, variant: "outline" },
    NO_ACTIVE_ORG: { label: "Set Active Org to Connect", icon: UserPlus, variant: "ghost", disabled: true },
};

/**
 * Connect button for the org public profile page.
 * Handles send / withdraw / accept / decline flows.
 */
export default function ConnectButton({
    targetOrgId,
    targetOrgName,
    activeOrgId,
    initialStatus,
    connectionId: initialConnectionId,
}: ConnectButtonProps) {
    const router = useRouter();
    const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
    const [connectionId, setConnectionId] = useState(initialConnectionId);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    const sendRequest = async () => {
        setLoading(true);
        try {
            const res = await axios.post(`/api/organizations/${targetOrgId}/connections`, { message });
            setConnectionId(res.data.connection.id);
            setStatus("PENDING_SENT");
            setOpen(false);
        } catch (e: any) {
            console.error(e?.response?.data?.error ?? "Failed to send request");
        } finally {
            setLoading(false);
        }
    };

    const respond = async (action: "ACCEPT" | "DECLINE") => {
        if (!connectionId) return;
        setLoading(true);
        try {
            await axios.patch(`/api/organizations/${targetOrgId}/connections/${connectionId}`, { action });
            setStatus(action === "ACCEPT" ? "ACCEPTED" : "DECLINED");
            router.refresh();
        } catch (e: any) {
            console.error(e?.response?.data?.error ?? "Failed");
        } finally {
            setLoading(false);
        }
    };

    const withdraw = async () => {
        if (!connectionId) return;
        setLoading(true);
        try {
            await axios.patch(`/api/organizations/${targetOrgId}/connections/${connectionId}`, { action: "WITHDRAW" });
            setStatus("WITHDRAWN");
            setConnectionId(undefined);
        } catch (e: any) {
            console.error(e?.response?.data?.error ?? "Failed");
        } finally {
            setLoading(false);
        }
    };

    // ── PENDING_RECEIVED: show Accept / Decline inline ────────────────────────
    if (status === "PENDING_RECEIVED") {
        return (
            <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 mr-1">Incoming request</span>
                <Button
                    size="sm"
                    className="gap-1.5 bg-green-600 hover:bg-green-700"
                    onClick={() => respond("ACCEPT")}
                    disabled={loading}
                >
                    <Check className="w-4 h-4" />Accept
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-red-500 border-red-200 hover:bg-red-50"
                    onClick={() => respond("DECLINE")}
                    disabled={loading}
                >
                    <X className="w-4 h-4" />Decline
                </Button>
            </div>
        );
    }

    // ── PENDING_SENT: show Withdraw ───────────────────────────────────────────
    if (status === "PENDING_SENT") {
        return (
            <Button
                variant="outline"
                size="sm"
                className="gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
                onClick={withdraw}
                disabled={loading}
            >
                <Clock className="w-4 h-4" />Request Sent — Withdraw
            </Button>
        );
    }

    // ── NONE / DECLINED / WITHDRAWN: show Send dialog ─────────────────────────
    if (status === "NONE" || status === "DECLINED" || status === "WITHDRAWN") {
        return (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button size="sm" className="gap-2" disabled={!activeOrgId}>
                        <UserPlus className="w-4 h-4" />Connect
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="sm:max-w-md bg-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Connect with {targetOrgName}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Send a connection request from your active organization. Add an optional intro message.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-3">
                        <Label htmlFor="conn-msg">Message <span className="text-gray-400 font-normal">(optional)</span></Label>
                        <Textarea
                            id="conn-msg"
                            placeholder="Tell them why you'd like to connect…"
                            className="resize-none h-24"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            maxLength={500}
                        />
                        <p className="text-xs text-gray-400 text-right">{message.length}/500</p>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={sendRequest} disabled={loading} className="gap-2">
                            <UserPlus className="w-4 h-4" />
                            {loading ? "Sending…" : "Send Request"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    // ── ACCEPTED / NO_ACTIVE_ORG / fallback ─────────────────────────────────
    return (
        <Button size="sm" variant={config.variant} disabled={config.disabled || loading} className="gap-2">
            <Icon className="w-4 h-4" />{config.label}
        </Button>
    );
}
