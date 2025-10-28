// Utils
import React from "react";

// UI
import { SidebarProvider, SidebarInset } from "@/shared/ui/shadcn/sidebar";

// Widgets
import AppSidebar from "@/widgets/app-sidebar";
import WelcomeDialog from "@/widgets/onboarding/ui/welcome/WelcomeDialog";
import AideDialog from "@/widgets/onboarding/ui/aide/AideDialog";

// API
import { useMe } from "@/widgets/app-sidebar/api/useMe";

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default function AppLayout({ children, sidebar }: AppLayoutProps) {
  const { user } = useMe();
  return (
    <SidebarProvider>
      {sidebar ?? <AppSidebar />}
      <SidebarInset>
        <div className="flex flex-1 flex-col h-screen overflow-hidden p-4 pt-0 relative">
          {children}

          <WelcomeDialog userEmail={user?.email} />
          <AideDialog userEmail={user?.email} />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
