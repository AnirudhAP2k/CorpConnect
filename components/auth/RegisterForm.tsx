"use client";

import React, { useState } from 'react';
import { CardWrapper } from '@/components/auth/card-wrapper';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { RegisterSchema } from "@/lib/validation";
import { z } from 'zod';
import axios from 'axios';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { FormErrors } from "@/components/FormErrors";
import { FormSuccess } from '@/components/FormSuccess';
import { useRouter } from 'next/navigation';

const RegisterForm = () => {
    const [errors, setErrors] = useState("");
    const [success, setSuccess] = useState("");
    const [isPending, setIsPending] = useState(false);

    const router = useRouter();

    const form = useForm<z.infer<typeof RegisterSchema>>({
        resolver: zodResolver(RegisterSchema),
        defaultValues: {
            email: "",
            password: "",
            name: "",
            confirmPassword: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof RegisterSchema>) => {
        setErrors("");
        setSuccess("");
        setIsPending(true);

        await axios
            .post('/api/auth/register', values, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            })
            .then((response) => {
                setSuccess(response.data.message);
                setTimeout(() => {
                    router.push('/login');
                }, 1500);
            })
            .catch((error) => {
                const errMessage = error.response?.data?.error || error.message;
                setErrors(errMessage);
            })
            .finally(() => {
                setIsPending(false);
            });
    };

    return (
        <CardWrapper
            headerTitle="Join the Network"
            headerLabel="Create an executive account for your organization"
            backButonLabel="Already have an account? Sign in"
            backButonHref="/login"
            showSocial
        >
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <div className="space-y-3">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                                        Full Name
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="Sarah Jenkins"
                                            type="text"
                                            disabled={isPending}
                                            className="h-11 rounded-xl bg-nx-surface-container-low border-nx-outline-variant/40 focus:bg-nx-surface-container-lowest focus:border-nx-on-tertiary-container px-4 text-sm font-body text-nx-on-surface placeholder:text-nx-on-surface-variant/50"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                                        Work Email
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="sarah@company.com"
                                            type="email"
                                            disabled={isPending}
                                            className="h-11 rounded-xl bg-nx-surface-container-low border-nx-outline-variant/40 focus:bg-nx-surface-container-lowest focus:border-nx-on-tertiary-container px-4 text-sm font-body text-nx-on-surface placeholder:text-nx-on-surface-variant/50"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                                        Password
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="••••••••"
                                            type="password"
                                            disabled={isPending}
                                            className="h-11 rounded-xl bg-nx-surface-container-low border-nx-outline-variant/40 focus:bg-nx-surface-container-lowest focus:border-nx-on-tertiary-container px-4 text-sm font-body text-nx-on-surface placeholder:text-nx-on-surface-variant/50"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                                        Confirm Password
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="••••••••"
                                            type="password"
                                            disabled={isPending}
                                            className="h-11 rounded-xl bg-nx-surface-container-low border-nx-outline-variant/40 focus:bg-nx-surface-container-lowest focus:border-nx-on-tertiary-container px-4 text-sm font-body text-nx-on-surface placeholder:text-nx-on-surface-variant/50"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormErrors message={errors} />
                    <FormSuccess message={success} />
                    <Button
                        className="w-full h-11 rounded-xl bg-nx-primary text-white font-headline font-semibold text-sm hover:opacity-90 transition-all shadow-nx-primary mt-2"
                        type="submit"
                        disabled={isPending}
                    >
                        {isPending ? "Creating Account..." : "Create Account"}
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    );
};

export default RegisterForm;
