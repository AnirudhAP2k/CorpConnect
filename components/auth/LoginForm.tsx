"use client";

import React, { useState } from 'react';
import { CardWrapper } from '@/components/auth/card-wrapper';
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@/lib/validation";
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
import { FormSuccess } from "@/components/FormSuccess";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { Mail, Lock, Eye, EyeOff, KeyRound, ArrowRight } from 'lucide-react';

const LoginForm = () => {
    const [errors, setErrors] = useState("");
    const [success, setSuccess] = useState("");
    const [isPending, setIsPending] = useState(false);
    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const router = useRouter();

    const form = useForm<z.infer<typeof LoginSchema>>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
            code: "",
        },
    });

    const onSubmit = async (values: z.infer<typeof LoginSchema>) => {
        setErrors("");
        setSuccess("");
        setIsPending(true);

        await axios
            .post('/api/auth/login', values, {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
            })
            .then((response) => {
                setSuccess(response.data.message);

                if (response.data.showTwoFactor) {
                    setShowTwoFactor(true);
                }

                if (response.status !== 202) {
                    form.reset();
                    setTimeout(() => {
                        router.push('/');
                    }, 1000);
                }
            })
            .catch((error: any) => {
                const errMessage = error.response?.data?.error || error.message;
                setErrors(errMessage);
            })
            .finally(() => {
                setIsPending(false);
            });
    };

    return (
        <CardWrapper
            headerTitle="Welcome Back"
            headerLabel="Sign in to your organization workspace"
            backButonLabel="Don't have an account? Sign up"
            backButonHref="/register"
            showSocial
        >
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <div className="space-y-3.5">
                        {!showTwoFactor && (
                            <>
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                                                Work Email
                                            </FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-nx-on-surface-variant/60">
                                                        <Mail className="w-4 h-4" />
                                                    </div>
                                                    <Input
                                                        {...field}
                                                        placeholder="alex.vance@company.com"
                                                        type="email"
                                                        disabled={isPending}
                                                        className="h-11 pl-10 pr-4 rounded-xl bg-nx-surface-container-low border-nx-outline-variant/40 focus:bg-nx-surface-container-lowest focus:border-nx-on-tertiary-container text-sm font-body text-nx-on-surface placeholder:text-nx-on-surface-variant/40 transition-all"
                                                    />
                                                </div>
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
                                            <div className="flex items-center justify-between">
                                                <FormLabel className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                                                    Password
                                                </FormLabel>
                                                <Button
                                                    size="sm"
                                                    variant="link"
                                                    asChild
                                                    className="px-0 h-auto font-body text-xs text-nx-on-tertiary-container hover:underline"
                                                >
                                                    <Link href="/reset">
                                                        Forgot password?
                                                    </Link>
                                                </Button>
                                            </div>
                                            <FormControl>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-nx-on-surface-variant/60">
                                                        <Lock className="w-4 h-4" />
                                                    </div>
                                                    <Input
                                                        {...field}
                                                        placeholder="••••••••"
                                                        type={showPassword ? "text" : "password"}
                                                        disabled={isPending}
                                                        className="h-11 pl-10 pr-10 rounded-xl bg-nx-surface-container-low border-nx-outline-variant/40 focus:bg-nx-surface-container-lowest focus:border-nx-on-tertiary-container text-sm font-body text-nx-on-surface placeholder:text-nx-on-surface-variant/40 transition-all"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-nx-on-surface-variant/60 hover:text-nx-on-surface transition-colors"
                                                        tabIndex={-1}
                                                    >
                                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                        {showTwoFactor && (
                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                                            Two Factor Code
                                        </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-nx-on-surface-variant/60">
                                                    <KeyRound className="w-4 h-4" />
                                                </div>
                                                <Input
                                                    {...field}
                                                    disabled={isPending}
                                                    placeholder="123456"
                                                    className="h-11 pl-10 pr-4 rounded-xl bg-nx-surface-container-low border-nx-outline-variant/40 focus:bg-nx-surface-container-lowest focus:border-nx-on-tertiary-container text-sm font-body text-nx-on-surface placeholder:text-nx-on-surface-variant/40 transition-all"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>
                    <FormErrors message={errors} />
                    <FormSuccess message={success} />
                    <Button
                        className="w-full h-11 rounded-xl bg-nx-primary text-white font-headline font-semibold text-sm hover:opacity-95 transition-all shadow-nx-primary mt-2 flex items-center justify-center gap-2 group"
                        type="submit"
                        disabled={isPending}
                    >
                        <span>{isPending ? "Signing in..." : showTwoFactor ? "Verify Code" : "Sign In"}</span>
                        {!isPending && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    );
};

export default LoginForm;
