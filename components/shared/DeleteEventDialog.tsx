"use client";

import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FormErrors } from "@/components/FormErrors";

interface DeleteEventDialogProps {
    eventId: string;
    eventTitle: string;
    variant?: "button" | "icon";
}

const DeleteEventDialog = ({ eventId, eventTitle, variant = "button" }: DeleteEventDialogProps) => {
    const [open, setOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleDelete = async () => {
        setIsDeleting(true);
        setError("");

        try {
            await axios.delete(`/api/events/${eventId}`);

            setOpen(false);
            router.push("/events");
            router.refresh();
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || "Failed to delete event";
            setError(errorMessage);
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                {variant === "icon" ? (
                    <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                ) : (
                    <Button variant="destructive" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Event
                    </Button>
                )}
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2">
                        <p>
                            This action cannot be undone. This will permanently delete the event:
                        </p>
                        <p className="font-semibold text-gray-900">"{eventTitle}"</p>
                        <p className="text-red-600">
                            All participant registrations will also be removed.
                        </p>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {error && <FormErrors message={error} />}

                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault();
                            handleDelete();
                        }}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700"
                    >
                        {isDeleting ? "Deleting..." : "Delete Event"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default DeleteEventDialog;
