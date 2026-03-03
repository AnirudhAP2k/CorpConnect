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