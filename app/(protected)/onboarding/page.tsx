import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OrganizationForm from "@/components/shared/OrganizationForm";
import { getAllIndustries } from "@/data/organization";
import { getAllTags } from "@/domain/tags";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const OnboardingPage = async () => {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    if (session.user.hasCompletedOnboarding) {
        redirect("/dashboard");
    }

    const [industries, tags] = await Promise.all([
        getAllIndustries(),
        getAllTags(),
    ]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-3xl font-bold">Welcome to CorpConnect</CardTitle>
                    <CardDescription className="text-base">
                        Let's get started by creating your organization profile.
                        This will help other businesses discover and connect with you.
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <OrganizationForm
                        userId={session.user.id}
                        type="Create"
                        industries={industries}
                        tags={tags}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default OnboardingPage;
