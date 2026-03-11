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
        label: "Discover Orgs",
        route: "/organizations/discover",
    },

    {
        label: "My Events",
        route: "/my-events",
    },
    {
        label: "Create Event",
        route: "/events/create",
    },
    {
        label: "Profile",
        route: "/profile",
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

export interface OptionsTypes {
    title: string;
    id: string;
    createdAt: Date;
    updatedAt: Date;
    label: string;
}

export const tokenVerificationBaseLink = `${process.env.NEXTAUTH_URL}/verify-token?token=`

export const passwordResetTokenBaseLink = `${process.env.NEXTAUTH_URL}/new-password?token=`

export const emailFooter = `<div class="footer">
      <p>© ${new Date().getFullYear()} Evently. All rights reserved.</p>
      <p style="font-size:12px;color:#999;">This is an automated email. Please do not reply to this message.</p>
    </div>`
