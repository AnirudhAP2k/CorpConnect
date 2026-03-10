import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getGroups } from "@/data/groups";
import { prisma } from "@/lib/db";
import GroupCard from "@/components/groups/GroupCard";
import CreateGroupButton from "@/components/groups/CreateGroupButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Building2 } from "lucide-react";

export const metadata = {
    title: "Industry Groups | Evently",
    description: "Connect with organizations in your industry consortiums",
};

export default async function GroupsPage({
    searchParams
}: {
    searchParams?: Promise<{ industryId?: string }>
}) {
    const session = await auth();
    if (!session?.user) redirect("/auth/login");

    const userId = session?.user?.id;
    if (!userId) redirect("/auth/login");

    const orgId = session.user.activeOrganizationId;

    if (!orgId) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-[50vh]">
                <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Active Organization Required</h2>
                <p className="text-muted-foreground">
                    You need to have an active organization to participate in Industry Groups.
                </p>
            </div>
        );
    }

    const resolvedSearchParams = searchParams ? await searchParams : {};
    const industryId = resolvedSearchParams.industryId;

    const { myGroups, discoverGroups } = await getGroups(orgId, industryId);

    // Get industries for the filter/dropdown
    const [allIndustries, myOrg] = await Promise.all([
        prisma.industry.findMany({ orderBy: { label: 'asc' } }),
        prisma.organizationMember.findUnique({
            where: { userId_organizationId: { userId, organizationId: orgId } }
        })
    ]);

    const isAdmin = myOrg?.role === "OWNER" || myOrg?.role === "ADMIN";

    return (
        <div className="container mx-auto max-w-7xl py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Industry Groups</h1>
                    <p className="text-muted-foreground mt-1">
                        Join consortiums to collaborate, share posts, and coordinate events within your industry.
                    </p>
                </div>
                {isAdmin && (
                    <CreateGroupButton industries={allIndustries} />
                )}
            </div>

            <Tabs defaultValue="my-groups" className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="my-groups">
                        My Groups ({myGroups.length})
                    </TabsTrigger>
                    <TabsTrigger value="discover">
                        Discover ({discoverGroups.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="my-groups" className="mt-0">
                    {myGroups.length === 0 ? (
                        <div className="text-center p-12 bg-muted/30 rounded-lg border border-dashed">
                            <h3 className="text-lg font-medium">No groups yet</h3>
                            <p className="text-muted-foreground mt-1">
                                You haven't joined any industry groups. Check out the Discover tab!
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myGroups.map((group: any) => (
                                <GroupCard key={group.id} group={group} joined={true} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="discover" className="mt-0">
                    {discoverGroups.length === 0 ? (
                        <div className="text-center p-12 bg-muted/30 rounded-lg border border-dashed">
                            <h3 className="text-lg font-medium">No groups found</h3>
                            <p className="text-muted-foreground mt-1">
                                There are no new groups available to join.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {discoverGroups.map((group: any) => (
                                <GroupCard key={group.id} group={group} joined={false} />
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
