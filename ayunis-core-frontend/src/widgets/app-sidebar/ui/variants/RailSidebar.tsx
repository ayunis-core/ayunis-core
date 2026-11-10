import { SidebarContent, SidebarFooter } from '@ayunis/ui/components/sidebar';
import type { SidebarNav } from '@/widgets/app-sidebar/model/useSidebarNav';
import { SidebarBrandHeader } from '@/widgets/app-sidebar/ui/SidebarBrandHeader';
import { FavoritesSidebarGroup } from '@/widgets/app-sidebar/ui/FavoritesSidebarGroup';
import { ChatsSidebarGroup } from '@/widgets/app-sidebar/ui/ChatsSidebarGroup';
import { OnboardingCard } from '@/widgets/app-sidebar/ui/OnboardingCard';
import { RailInboxButton, RailNavButton, RailUserMenu } from './RailButtons';

function RailColumn({ nav }: Readonly<{ nav: SidebarNav }>) {
  const newChat = nav.primary.find((item) => item.id === 'new-chat');
  const rest = nav.primary.filter((item) => item.id !== 'new-chat');
  return (
    <nav
      aria-label="Hauptnavigation"
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-sidebar-border py-3"
    >
      {newChat && <RailNavButton item={newChat} emphasized />}
      <div className="my-1 h-px w-6 bg-sidebar-border" />
      {nav.routinesEnabled && <RailInboxButton />}
      {[...rest, ...nav.secondary].map((item) => (
        <RailNavButton key={item.id} item={item} />
      ))}
      <div className="mt-auto">
        <RailUserMenu />
      </div>
    </nav>
  );
}

export function RailSidebar({ nav }: Readonly<{ nav: SidebarNav }>) {
  return (
    <div className="flex min-h-0 flex-1">
      <RailColumn nav={nav} />
      <div className="flex min-w-0 flex-1 flex-col">
        <SidebarBrandHeader />
        <SidebarContent>
          <FavoritesSidebarGroup />
          <ChatsSidebarGroup />
        </SidebarContent>
        <SidebarFooter data-testid="sidebar-footer">
          <OnboardingCard />
        </SidebarFooter>
      </div>
    </div>
  );
}
