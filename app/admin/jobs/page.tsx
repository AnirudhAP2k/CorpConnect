import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { listJobQueueAdminAction } from "@/actions/admin.actions";
import { AdminJobsClient } from "@/components/admin/AdminJobsClient";

export const metadata = {
    title: "Job Queue Management | Admin Console",
};

export default async function AdminJobsPage() {
    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isAppAdmin: true },
    });

    if (!user?.isAppAdmin) {
        redirect("/dashboard");
    }

    const res = await listJobQueueAdminAction({ status: "FAILED", page: 1, limit: 15 });

    const initialData = res.success
        ? res.data
        : {
              jobs: [],
              totalCount: 0,
              totalPages: 1,
              currentPage: 1,
              stats: { failed: 0, pending: 0, processing: 0, completed: 0, cancelled: 0 },
          };

    return <AdminJobsClient initial={initialData} />;
}
