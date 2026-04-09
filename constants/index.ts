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
