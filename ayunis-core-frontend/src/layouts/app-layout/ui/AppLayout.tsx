import React from 'react';
import { useRouterState } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset } from '@ayunis/ui/components/sidebar';
import AppSidebar from '@/widgets/app-sidebar';
import AppAlertBanner from '@/widgets/app-alert-banner';
import { useEmbedded } from '@/shared/contexts/embedded/useEmbedded';

interface AppLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export default function AppLayout({
  children,
  sidebar,
}: Readonly<AppLayoutProps>) {
  const { location } = useRouterState();
  const isEmbedded = useEmbedded();

  return (
    <SidebarProvider pathname={location.pathname}>
      {!isEmbedded && (sidebar ?? <AppSidebar />)}
      <SidebarInset className="md:peer-data-[variant=inset]:[box-shadow:var(--shadow-sidebar-inset)]">
        <div className="flex flex-1 flex-col min-h-0">
          <AppAlertBanner />
          <div className="flex flex-1 flex-col min-h-0 p-4 pt-0 relative md:rounded-xl md:overflow-hidden">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
