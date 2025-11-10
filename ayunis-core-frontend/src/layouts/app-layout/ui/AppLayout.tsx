// Utils
import React from "react";

// UI
import { SidebarProvider, SidebarInset } from "@/shared/ui/shadcn/sidebar";

// Widgets
import AppSidebar from "@/widgets/app-sidebar";
import WelcomeDialog from "@/widgets/onboarding/ui/welcome/WelcomeDialog";

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default function AppLayout({ children, sidebar }: AppLayoutProps) {
  return (
    <SidebarProvider>
      {sidebar ?? <AppSidebar />}
      <SidebarInset>
        <div className="flex flex-1 flex-col h-screen overflow-hidden p-4 pt-0 relative">
          {children}

          <WelcomeDialog />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
