"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";

import {
    Form,
    FormField,
    FormItem,
    FormControl,
    FormMessage,
    FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { FormErrors } from "@/components/FormErrors";
import { FormSuccess } from "@/components/FormSuccess";
import { UserPlus } from "lucide-react";

const MemberInviteSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
});

interface MemberInviteFormProps {
    organizationId: string;
    onSuccess?: () => void;
}

const MemberInviteForm = ({
    organizationId,
    onSuccess,
}: MemberInviteFormProps) => {
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof MemberInviteSchema>>({
        resolver: zodResolver(MemberInviteSchema),
        defaultValues: {
            email: "",
            role: "MEMBER",
        },
    });

    const onSubmit = async (values: z.infer<typeof MemberInviteSchema>) => {
        setError("");
        setSuccess("");

        startTransition(async () => {
            try {
                const response = await axios.post(
                    `/api/organizations/${organizationId}/members`,
                    values
                );

                setSuccess(response.data.message);
                form.reset();

                if (onSuccess) {
                    setTimeout(() => {
                        onSuccess();
                    }, 1000);
                }
            } catch (err: any) {
                const errMessage = err.response?.data?.error || "Failed to add member";
                setError(errMessage);
            }
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="flex gap-4">
                    {/* Email Input */}
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel>Email Address</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="member@example.com"
                                        {...field}
                                        disabled={isPending}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Role Selector */}
                    <FormField
                        control={form.control}
                        name="role"
                        render={({ field }) => (
                            <FormItem className="w-40">
                                <FormLabel>Role</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    disabled={isPending}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="MEMBER">Member</SelectItem>
                                        <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Submit Button */}
                    <div className="flex items-end">
                        <Button type="submit" disabled={isPending} className="gap-2">
                            <UserPlus className="w-4 h-4" />
                            {isPending ? "Adding..." : "Add Member"}
                        </Button>
                    </div>
                </div>

                <FormErrors message={error} />
                <FormSuccess message={success} />
            </form>
        </Form>
    );
};

export default MemberInviteForm;
