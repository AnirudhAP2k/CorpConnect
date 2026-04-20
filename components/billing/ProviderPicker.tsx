"use client";

/**
 * components/billing/ProviderPicker.tsx
 *
 * Small modal shown when a user clicks "Register & Pay" on a PLATFORM-mode event.
 * Lets them pick Stripe (international) or Razorpay (India).
 * Calls /api/events/[id]/checkout and redirects.
 */

import { useState, useTransition } from "react";

interface ProviderPickerProps {
    eventId: string;
    eventTitle: string;
    price: string;
    currency: string;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ProviderPicker({
    eventId,
    eventTitle,
    price,
    currency,
    onClose,
    onSuccess,
}: ProviderPickerProps) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const pay = (provider: "stripe" | "razorpay") => {
        setError(null);
        startTransition(async () => {
            try {
                const res = await fetch(`/api/events/${eventId}/checkout`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ provider }),
                });
                const data = await res.json();

                if (!res.ok) {
                    setError(data.error ?? "Checkout failed. Please try again.");
                    return;
                }

                if (data.mode === "free") {
                    onSuccess?.();
                    onClose();
                    return;
                }

                if (data.mode === "external") {
                    window.open(data.url, "_blank");
                    onClose();
                    return;
                }

                if (data.url) {
                    // Stripe redirect
                    window.location.href = data.url;
                    return;
                }

                // Razorpay — open inline checkout
                if (data.orderId && typeof window !== "undefined") {
                    const { Razorpay: RazorpayCheckout } = await import("razorpay" as any);
                    const rzp = new (window as any).Razorpay({
                        key: data.keyId,
                        amount: data.amount,
                        currency: data.currency,
                        name: "CorpConnect",
                        description: data.eventTitle,
                        order_id: data.orderId,
                        callback_url: data.callbackUrl,
                        prefill: data.prefill,
                        theme: { color: "#6366f1" },
                    });
                    rzp.open();
                    onClose();
                }
            } catch {
                setError("Something went wrong. Please try again.");
            }
        });
    };

    return (
        <div className="provider-modal-backdrop" onClick={onClose}>
            <div
                className="provider-modal"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="provider-picker-title"
            >
                <button className="modal-close-btn" onClick={onClose} aria-label="Close">
                    ✕
                </button>

                <div className="modal-header">
                    <div className="modal-icon">💳</div>
                    <h2 id="provider-picker-title" className="modal-title">
                        Complete Your Registration
                    </h2>
                    <p className="modal-subtitle">
                        <strong>{eventTitle}</strong> — {currency} {price}
                    </p>
                </div>

                <p className="modal-instruction">Choose your preferred payment method:</p>

                <div className="provider-options">
                    <button
                        className="provider-option"
                        onClick={() => pay("razorpay")}
                        disabled={isPending}
                        id="pay-razorpay-btn"
                    >
                        <div className="provider-option-icon">🇮🇳</div>
                        <div className="provider-option-content">
                            <span className="provider-option-name">Razorpay</span>
                            <span className="provider-option-desc">UPI, Net Banking, Cards (INR)</span>
                        </div>
                        <span className="provider-option-arrow">→</span>
                    </button>

                    <button
                        className="provider-option"
                        onClick={() => pay("stripe")}
                        disabled={isPending}
                        id="pay-stripe-btn"
                    >
                        <div className="provider-option-icon">🌍</div>
                        <div className="provider-option-content">
                            <span className="provider-option-name">Stripe</span>
                            <span className="provider-option-desc">Cards, Apple Pay (International)</span>
                        </div>
                        <span className="provider-option-arrow">→</span>
                    </button>
                </div>

                {error && <p className="provider-error">{error}</p>}

                {isPending && (
                    <p className="provider-loading">Preparing checkout…</p>
                )}

                <p className="modal-secure-note">
                    🔒 Payments are secured by Stripe / Razorpay. CorpConnect never stores card details.
                </p>
            </div>
        </div>
    );
}
