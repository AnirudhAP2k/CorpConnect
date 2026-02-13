import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OrganizationForm from "@/components/shared/OrganizationForm";
import { getAllIndustries } from "@/data/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const OnboardingPage = async () => {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // If user has already completed onboarding, redirect to dashboard
    // This will be checked by middleware, but double-check here

    const industries = await getAllIndustries();

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl shadow-lg">
                <CardHeader className="space-y-2 text-center">
                    <CardTitle className="text-3xl font-bold">Welcome to Evently! 🎉</CardTitle>
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
                    />
                </CardContent>
            </Card>
        </div>
    );
};

export default OnboardingPage;
