import TopHeader from "@/components/shared/TopHeader";
import Sidebar from "@/components/shared/Sidebar";
import { SessionProvider } from 'next-auth/react';
import { auth } from "@/auth";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const activeOrganizationId = session?.user?.activeOrganizationId || null;
  const isAdmin = session?.user?.isAppAdmin || false;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopHeader />
      <SessionProvider>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar activeOrganizationId={activeOrganizationId} isAdmin={isAdmin} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </SessionProvider>
    </div>
  );
}
