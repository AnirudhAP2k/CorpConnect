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
import Link from 'next/link';
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';
import { calculatePasswordStrength } from '@/lib/utils';

const RegisterForm = () => {
    const [errors, setErrors] = useState("");
    const [success, setSuccess] = useState("");
    const [isPending, setIsPending] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [termsError, setTermsError] = useState("");

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

    const watchPassword = form.watch("password");
    const passwordStrength = calculatePasswordStrength(watchPassword || "");

    const onSubmit = async (values: z.infer<typeof RegisterSchema>) => {
        setErrors("");
        setSuccess("");
        setTermsError("");

        if (!agreedToTerms) {
            setTermsError("You must accept the Terms of Service to create an account.");
            return;
        }

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
            headerTitle="Create Executive Account"
            headerLabel="Join an exclusive B2B network of decision-makers"
            backButonLabel="Already have an account? Sign in"
            backButonHref="/login"
            showSocial
        >
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                >
                    <div className="space-y-3.5">
                        {/* Full Name Field */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant flex items-center justify-between">
                                        <span>Full Name</span>
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-nx-on-surface-variant/60">
                                                <User className="w-4 h-4" />
                                            </div>
                                            <Input
                                                {...field}
                                                placeholder="Sarah Jenkins"
                                                type="text"
                                                disabled={isPending}
                                                className="h-11 pl-10 pr-4 rounded-xl bg-nx-surface-container-low border-nx-outline-variant/40 focus:bg-nx-surface-container-lowest focus:border-nx-on-tertiary-container text-sm font-body text-nx-on-surface placeholder:text-nx-on-surface-variant/40 transition-all"
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Work Email Field */}
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
                                                placeholder="sarah@company.com"
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

                        {/* Password Field */}
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant flex items-center justify-between">
                                        <span>Password</span>
                                        {passwordStrength.label && (
                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${passwordStrength.score === 1 ? 'text-red-600 bg-red-50' :
                                                passwordStrength.score === 2 ? 'text-amber-600 bg-amber-50' :
                                                    'text-emerald-600 bg-emerald-50'
                                                }`}>
                                                {passwordStrength.label}
                                            </span>
                                        )}
                                    </FormLabel>
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

                                    {/* Password Strength Indicator Bar — always rendered to prevent layout shift */}
                                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                                        <div className={`h-1 rounded-full transition-colors duration-300 ${watchPassword && passwordStrength.score >= 1 ? passwordStrength.color : 'bg-nx-outline-variant/20'}`} />
                                        <div className={`h-1 rounded-full transition-colors duration-300 ${watchPassword && passwordStrength.score >= 2 ? passwordStrength.color : 'bg-nx-outline-variant/20'}`} />
                                        <div className={`h-1 rounded-full transition-colors duration-300 ${watchPassword && passwordStrength.score >= 3 ? passwordStrength.color : 'bg-nx-outline-variant/20'}`} />
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Confirm Password Field */}
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-label font-semibold uppercase tracking-wider text-nx-on-surface-variant">
                                        Confirm Password
                                    </FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-nx-on-surface-variant/60">
                                                <ShieldCheck className="w-4 h-4" />
                                            </div>
                                            <Input
                                                {...field}
                                                placeholder="••••••••"
                                                type={showConfirmPassword ? "text" : "password"}
                                                disabled={isPending}
                                                className="h-11 pl-10 pr-10 rounded-xl bg-nx-surface-container-low border-nx-outline-variant/40 focus:bg-nx-surface-container-lowest focus:border-nx-on-tertiary-container text-sm font-body text-nx-on-surface placeholder:text-nx-on-surface-variant/40 transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-nx-on-surface-variant/60 hover:text-nx-on-surface transition-colors"
                                                tabIndex={-1}
                                            >
                                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Terms of Service Checkbox */}
                        <div className="pt-1">
                            <label className="flex items-start gap-2.5 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => {
                                        setAgreedToTerms(e.target.checked);
                                        if (e.target.checked) setTermsError("");
                                    }}
                                    className="mt-0.5 h-4 w-4 rounded border-nx-outline-variant/60 text-nx-primary focus:ring-nx-primary cursor-pointer accent-[#041627]"
                                />
                                <span className="text-xs font-body text-nx-on-surface-variant/80 leading-snug">
                                    I agree to the{" "}
                                    <Link href="/terms" className="font-semibold text-nx-on-tertiary-container underline hover:opacity-80">
                                        Terms of Service
                                    </Link>{" "}
                                    and{" "}
                                    <Link href="/privacy" className="font-semibold text-nx-on-tertiary-container underline hover:opacity-80">
                                        Privacy Policy
                                    </Link>
                                    .
                                </span>
                            </label>
                            {termsError && (
                                <p className="text-xs font-semibold text-red-500 mt-1">{termsError}</p>
                            )}
                        </div>
                    </div>

                    <FormErrors message={errors} />
                    <FormSuccess message={success} />

                    <Button
                        className="w-full h-11 rounded-xl bg-nx-primary text-white font-headline font-semibold text-sm hover:opacity-95 transition-all shadow-nx-primary mt-2 flex items-center justify-center gap-2 group"
                        type="submit"
                        disabled={isPending}
                    >
                        <span>{isPending ? "Creating Executive Account..." : "Create Executive Account"}</span>
                        {!isPending && <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />}
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    );
};

export default RegisterForm;
