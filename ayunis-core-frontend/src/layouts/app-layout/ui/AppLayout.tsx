import React from 'react';
import { useRouterState } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset } from '@/shared/ui/shadcn/sidebar';
import AppSidebar from '@/widgets/app-sidebar';
import { useApplyOrgTheme } from '@/features/org-theme';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default function AppLayout({
  children,
  sidebar,
}: Readonly<AppLayoutProps>) {
  const { location } = useRouterState();

  useApplyOrgTheme();

  return (
    <SidebarProvider pathname={location.pathname}>
      {sidebar ?? <AppSidebar />}
      <SidebarInset>
        <div className="flex flex-1 flex-col h-screen overflow-hidden p-4 pt-0 relative">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
