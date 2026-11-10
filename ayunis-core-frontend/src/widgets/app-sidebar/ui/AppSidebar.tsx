import React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
} from '@ayunis/ui/components/sidebar';
import { ChatsSidebarGroup } from './ChatsSidebarGroup';
import { FavoritesSidebarGroup } from './FavoritesSidebarGroup';
import useKeyboardShortcut from '@/features/useKeyboardShortcut';
import { useNavigate } from '@tanstack/react-router';
import { useAcademyAccessStatus } from '@/features/academy';
import { OnboardingCard } from './OnboardingCard';
import { useMobileSidebarNavigationHandler } from '@/widgets/app-sidebar/hooks/useMobileSidebarNavigationHandler';
import { useUnreadNotificationCount } from '@/features/notifications';
import {
  useSidebarVariant,
  type SidebarVariant,
} from '@/shared/lib/prototype-settings';
import {
  useSidebarNav,
  type SidebarNav,
} from '@/widgets/app-sidebar/model/useSidebarNav';
import { useSidebarInboxCount } from '@/widgets/app-sidebar/model/useSidebarInboxCount';
import { SidebarNavMenuItems } from './SidebarNavLink';
import { SidebarInboxMenuItem } from './SidebarInboxMenuItem';
import { SidebarBrandHeader } from './SidebarBrandHeader';
import { SidebarUserMenu } from './SidebarUserMenu';
import { LinearNav } from './variants/LinearNav';
import { RailSidebar } from './variants/RailSidebar';
import { MiniFeedGroup } from './variants/MiniFeedGroup';

function useNewChatShortcut() {
  const navigate = useNavigate();
  const { isGated: isAcademyGated } = useAcademyAccessStatus();
  useKeyboardShortcut(['j', 'Meta'], () => {
    // Mirrors the disabled "New chat" item below — otherwise the shortcut
    // bypasses the gate entirely.
    if (isAcademyGated) return;
    void navigate({ to: '/chat' });
  });
}

function MainNavGroup({ nav }: Readonly<{ nav: SidebarNav }>) {
  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarNavMenuItems items={[...nav.primary, ...nav.secondary]} />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function CurrentInboxItem() {
  const { unreadCount } = useUnreadNotificationCount();
  return <SidebarInboxMenuItem unreadCount={unreadCount} />;
}

function PrototypeInboxItem() {
  const unreadCount = useSidebarInboxCount();
  return <SidebarInboxMenuItem unreadCount={unreadCount} />;
}

function SidebarFooterSection({
  nav,
  variant,
}: Readonly<{ nav: SidebarNav; variant: SidebarVariant }>) {
  const showInbox =
    nav.routinesEnabled && (variant === 'current' || variant === 'feed');
  return (
    <SidebarFooter data-testid="sidebar-footer">
      <OnboardingCard />
      <SidebarMenu>
        {/* Not tied to manage_routines: notifications stay readable without it. */}
        {showInbox &&
          (variant === 'current' ? (
            <CurrentInboxItem />
          ) : (
            <PrototypeInboxItem />
          ))}
        <SidebarUserMenu />
      </SidebarMenu>
    </SidebarFooter>
  );
}

function StandardSidebarBody({
  nav,
  variant,
}: Readonly<{ nav: SidebarNav; variant: SidebarVariant }>) {
  const isLinear = variant === 'linear';
  return (
    <>
      <SidebarBrandHeader />
      <SidebarContent>
        {isLinear ? <LinearNav nav={nav} /> : <MainNavGroup nav={nav} />}
        {variant === 'feed' && (
          <MiniFeedGroup routinesEnabled={nav.routinesEnabled} />
        )}
        <FavoritesSidebarGroup />
        <ChatsSidebarGroup />
      </SidebarContent>
      <SidebarFooterSection nav={nav} variant={variant} />
    </>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const handleMobileNavigation = useMobileSidebarNavigationHandler();
  const nav = useSidebarNav();
  const [variant] = useSidebarVariant();
  useNewChatShortcut();

  return (
    <Sidebar
      {...props}
      variant="inset"
      data-testid="sidebar"
      onClickCapture={handleMobileNavigation}
    >
      {variant === 'rail' ? (
        <RailSidebar nav={nav} />
      ) : (
        <StandardSidebarBody nav={nav} variant={variant} />
      )}
    </Sidebar>
  );
}
