import React from 'react';
import { useRouterState } from '@tanstack/react-router';
import { SidebarProvider, SidebarInset } from '@ayunis/ui/components/sidebar';
import AppSidebar from '@/widgets/app-sidebar';
import AppAlertBanner from '@/widgets/app-alert-banner';
import {
  CertificateExpiryBanner,
  CertificateExpiryDialog,
} from '@/widgets/certificate-expiry';
import { useEmbedded } from '@/shared/contexts/embedded/embeddedContext';

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
          {!isEmbedded && <AppAlertBanner />}
          {!isEmbedded && <CertificateExpiryBanner />}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden p-2 pt-0 sm:p-4 sm:pt-0 md:rounded-xl md:overflow-hidden">
            {children}
          </div>
          {!isEmbedded && <CertificateExpiryDialog />}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
