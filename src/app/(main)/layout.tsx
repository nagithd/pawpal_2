"use client";

import TopBar from "@/components/TopBar";
import GlobalCallNotification from "@/components/GlobalCallNotification";
import { UserProvider } from "@/lib/contexts/UserContext";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <TopBar />
      {children}
      <GlobalCallNotification />
    </UserProvider>
  );
}
