import React from 'react';
import { useRouterState } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset } from '@/shared/ui/shadcn/sidebar';
import AppSidebar from '@/widgets/app-sidebar';
import { useApplyOrgTheme } from '@/features/org-theme';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  applyOrgTheme?: boolean;
}

export default function AppLayout({
  children,
  sidebar,
  applyOrgTheme = true,
}: Readonly<AppLayoutProps>) {
  const { location } = useRouterState();

  useApplyOrgTheme(applyOrgTheme);

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
