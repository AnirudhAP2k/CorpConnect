import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import MembersManagementClient from "@/components/shared/MembersManagementClient";
import axios from "axios";

interface MembersManagementPageProps {
    params: {
        id: string;
    };
}

const MembersManagementPage = async ({ params }: MembersManagementPageProps) => {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
        redirect("/login");
    }

    // Fetch organization data
    let organization;
    try {
        const response = await axios.get(
            `/api/organizations/${params.id}`,
        );

        if (response.status !== 200) {
            notFound();
        }

        organization = response.data;
    } catch (error) {
        notFound();
    }

    // Check if current user is OWNER or ADMIN
    const currentUserMembership = organization.members.find(
        (m: any) => m.userId === userId
    );

    if (!currentUserMembership || !["OWNER", "ADMIN"].includes(currentUserMembership.role)) {
        redirect(`/organizations/${params.id}`);
    }

    return (
        <MembersManagementClient
            organizationId={params.id}
            initialMembers={organization.members}
            currentUserRole={currentUserMembership.role}
        />
    );
};

export default MembersManagementPage;
