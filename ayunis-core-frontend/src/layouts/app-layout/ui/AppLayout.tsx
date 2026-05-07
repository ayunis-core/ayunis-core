import React from 'react';
import { SidebarProvider, SidebarInset } from '@/shared/ui/shadcn/sidebar';
import AppSidebar from '@/widgets/app-sidebar';
import SpotlightOverlay from '@/shared/ui/spotlight-overlay/SpotlightOverlay';
import { GettingStartedPill } from '@/features/getting-started-pill';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default function AppLayout({
  children,
  sidebar,
}: Readonly<AppLayoutProps>) {
  return (
    <SidebarProvider>
      {sidebar ?? <AppSidebar />}
      <SidebarInset>
        <div className="flex flex-1 flex-col h-screen overflow-hidden p-4 pt-0 relative">
          {children}
        </div>
      </SidebarInset>
      <SpotlightOverlay />
      <GettingStartedPill />
    </SidebarProvider>
  );
}
