"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

export default function CreateGroupButton({ industries }: { industries: { id: string, label: string }[] }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name"),
            description: formData.get("description"),
            industryId: formData.get("industryId"),
            logo: formData.get("logo"),
        };

        try {
            const res = await axios.post("/api/groups", data);

            toast.success("Group created successfully.");
            setOpen(false);
            router.refresh();
            router.push(`/groups/${res.data.id}`);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to create group");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <Button onClick={() => setOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Group
            </Button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
                        onClick={() => !isLoading && setOpen(false)}
                    />

                    {/* Modal Content */}
                    <div className="bg-card w-full max-w-lg mx-auto p-6 rounded-lg border shadow-lg relative z-50 flex flex-col gap-4 mx-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-lg font-semibold leading-none tracking-tight">Create Industry Group</h2>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Create a new consortium for your industry. As the creator, your organization will be the owner.
                                </p>
                            </div>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => !isLoading && setOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        <form onSubmit={onSubmit} className="flex flex-col gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Group Name *</Label>
                                <Input id="name" name="name" required placeholder="e.g. Fintech Innovators" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="industryId">Industry *</Label>
                                <Select name="industryId" required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select industry" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {industries.map(ind => (
                                            <SelectItem key={ind.id} value={ind.id}>{ind.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="logo">Logo URL</Label>
                                <Input id="logo" name="logo" type="url" placeholder="https://example.com/logo.png" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    placeholder="What is this group about?"
                                    className="resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 mt-4">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? "Creating..." : "Create Group"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
