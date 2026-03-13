"use client";

import Sidebar from "@/components/Sidebar";
import GlobalCallNotification from "@/components/GlobalCallNotification";
import { UserProvider } from "@/lib/contexts/UserContext";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 md:ml-60 pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <GlobalCallNotification />
    </UserProvider>
  );
}
