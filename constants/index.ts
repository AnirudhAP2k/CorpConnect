import { AutomationTriggerType } from "@/lib/types";

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

export const tokenVerificationBaseLink = `${process.env.NEXTAUTH_URL}/verify-token?token=`

export const passwordResetTokenBaseLink = `${process.env.NEXTAUTH_URL}/new-password?token=`

export const emailFooter = `<div class="footer">
      <p>© ${new Date().getFullYear()} Evently. All rights reserved.</p>
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
    FREE: 100,
    PRO: 5_000,
    ENTERPRISE: 50_000,
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
