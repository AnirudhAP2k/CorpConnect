import { AutomationTriggerType } from "@/lib/types";
import type { SubscriptionPlan, SubscriptionStatus, PaymentProvider } from "@prisma/client";

export const headerLinks = [
    {
        label: "Home",
        route: "/",
    },
    {
        label: "About",
        route: "/about",
    },
    {
        label: "Events",
        route: "/events",
    },
    {
        label: "Organisations",
        route: "/organizations/discover",
    },
    {
        label: "Membership",
        route: "/pricing",
    }
];

export const sidebarLinks = [
    {
        label: "Dashboard",
        route: "/dashboard",
        icon: "Home",
    },
    {
        label: "Discover Orgs",
        route: "/organizations/discover",
        icon: "Building2",
    },
    {
        label: "Industry Groups",
        route: "/groups",
        icon: "UsersRound",
    },
    {
        label: "Messages",
        route: "/messaging",
        icon: "MessageSquare",
    },
    {
        label: "Events Directory",
        route: "/events",
        icon: "CalendarDays",
    },
    {
        label: "My Events",
        route: "/my-events",
        icon: "Ticket",
    }
];

export const eventDefaultValues = {
    title: "",
    description: "",
    location: "",
    imageUrl: "",
    startDateTime: new Date(),
    endDateTime: new Date(),
    categoryId: "",
}

export const tokenVerificationBaseLink = `${process.env.NEXT_PUBLIC_APP_URL}/verify-token?token=`

export const passwordResetTokenBaseLink = `${process.env.NEXT_PUBLIC_APP_URL}/new-password?token=`

export const emailFooter = `<div class="footer">
      <p>© ${new Date().getFullYear()} CorpConnect. All rights reserved.</p>
      <p style="font-size:12px;color:#999;">This is an automated email. Please do not reply to this message.</p>
    </div>`

export const SESSION_COOKIE_NAME =
    process.env.NODE_ENV === "production"
        ? "__Secure-authjs.session-token"
        : "authjs.session-token";

export const JWT_MAX_AGE_SECONDS = 15 * 60;

export const JWT_REFRESH_EARLY_MS = 2 * 60 * 1000;

export const subscriptionPlans = ["PRO", "ENTERPRISE"];

export const paymentProviders = ["stripe", "razorpay"];

export const PLAN_API_LIMITS: Record<string, number> = {
    FREE: 10,
    PRO: 5_00,
    ENTERPRISE: 1_000,
};

/**
 * Monthly AI feature usage limits per subscription plan.
 * These govern tenant-facing AI calls made through the Next.js app
 * (recommendations, search, chat, content generation, etc.).
 *
 * System-internal calls (embedding jobs, sentiment analysis, report generation)
 * are platform-operated and do NOT count against these limits.
 */
export const AI_PLAN_LIMITS: Record<string, number> = {
    FREE: 0,
    PRO: 500,
    ENTERPRISE: 5_000,
};

/**
 * Minimum subscription plan required per AI feature.
 * Used by the quota gate to block features on lower plans.
 */
export const AI_FEATURE_MIN_PLAN: Record<string, string> = {
    recommendEvents: "PRO",
    recommendOrgs: "PRO",
    search: "PRO",
    generateDescription: "PRO",
    matchmakingReason: "PRO",
    chat: "PRO",
    chatHistory: "PRO",
    chatBrainstorm: "ENTERPRISE",
    chatBrainstormBrief: "ENTERPRISE",
    analyseSentiment: "PRO",
    eventSummary: "ENTERPRISE",
};

export const TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
    EVENT_REGISTRATION: "New Event Registration",
    EVENT_CANCELLED: "Event Cancelled",
    FEEDBACK_RECEIVED: "Feedback Submitted",
    CONNECTION_ACCEPTED: "Connection Accepted",
    MEETING_SCHEDULED: "Meeting Request Accepted",
    NEW_MEMBER_JOINED: "New Member Joined",
};

export const FREE_FEATURES = [
    "Organisation profile & discovery",
    "Browse the events directory",
    "Join up to 2 industry groups",
    "Up to 5 connection requests / month",
    "Basic AI-powered organisation search",
    "Attend public events",
];

export const PRO_FEATURES = [
    "Everything in Free",
    "Unlimited connection requests",
    "Priority meeting request inbox",
    "Send & receive partnership proposals",
    "Full AI matchmaking & recommendations",
    "Host private & invite-only events",
    "Featured organisation profile badge",
    "Advanced event analytics dashboard",
    "100 AI API calls / month",
];

export const ENTERPRISE_FEATURES = [
    "Everything in Pro",
    "Unlimited AI API calls with SLA",
    "Dedicated account manager",
    "Custom automation rules & webhooks",
    "Bulk organisation networking tools",
    "Private industry group creation",
    "White-label event pages",
    "Priority support & onboarding",
    "Custom contract & invoicing",
];

export const GENERIC_EMAIL_PROVIDERS = [
    "yahoo.com", "hotmail.com", "outlook.com",
    "icloud.com", "protonmail.com", "aol.com", "mail.com",
    "yopmail.com", "tempmail.com", "10minutemail.com", "guerrillamail.com",
    "mailinator.com", "throwawaymail.com", "getnada.com", "temp-mail.org",
];


export const ALLOWED_MIME = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]);

export const KYB_DOC_TYPES = new Set([
    "INCORPORATION_CERT",
    "TAX_CERTIFICATE",
    "ADDRESS_PROOF",
    "OTHER_KYB",
    "LEGAL_COMPLIANCE",
    "COMPANY_DESCRIPTION",
    "EVENT_DESCRIPTION",
    "GENERAL",
]);

export const AUTH_SESSION_HEADER = "x-auth-session";

export const PLAN_COLORS: Record<SubscriptionPlan, string> = {
    FREE: "#64748b",
    PRO: "#6366f1",
    ENTERPRISE: "#f59e0b",
};

export const STATUS_COLORS: Record<SubscriptionStatus, string> = {
    ACTIVE: "#22c55e",
    PAST_DUE: "#f97316",
    CANCELLED: "#ef4444",
    TRIALING: "#8b5cf6",
};

export const PLAN_FEATURES: Record<SubscriptionPlan, { text: string; isNew?: boolean }[]> = {
    FREE: [
        { text: "Up to 3 active public events" },
        { text: "Max 50 attendees per event" },
        { text: "Basic org profile" },
        { text: "Org discovery & connection requests" },
    ],
    PRO: [
        { text: "Unlimited events" },
        { text: "AI matchmaking & semantic search" },
        { text: "Analytics dashboard" },
        { text: "Payment modes: PLATFORM & EXTERNAL" },
        { text: "Business messaging (1-to-1)" },
        { text: "2% platform fee" },
    ],
    ENTERPRISE: [
        { text: "Everything in PRO" },
        { text: "Group messaging", isNew: true },
        { text: "AI Event Brainstorming Assistant", isNew: true },
        { text: "Pitch-to-admin workflow", isNew: true },
        { text: "Post-event AI analytics reports", isNew: true },
        { text: "API access & webhooks" },
        { text: "1% platform fee" },
    ],
};
