import React from "react";
import { SidebarProvider, SidebarInset } from "@/shared/ui/shadcn/sidebar";
import AppSidebar from "@/widgets/app-sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default function AppLayout({ children, sidebar }: AppLayoutProps) {
  return (
    <SidebarProvider>
      {sidebar ?? <AppSidebar />}
      <SidebarInset>
        <div className="flex flex-1 flex-col h-screen overflow-hidden p-4 pt-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
