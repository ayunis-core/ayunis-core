import type { ComponentType } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import {
  Brain,
  Building2,
  ChevronUp,
  FolderOpen,
  GraduationCap,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Sparkles,
  Store,
  User2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import { useTheme } from '@/features/theme';
import brandFullDark from '@/shared/assets/brand/brand-full-dark.svg';
import brandFullLight from '@/shared/assets/brand/brand-full-light.svg';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import {
  allWorkspaces,
  managedTeams,
  personForRole,
  workspaceMemberIds,
} from '@/widgets/sharing-prototype/model/access';
import {
  favoriteWorkspaceIdsOf,
  useHasPermission,
  usePrototypeState,
} from '@/widgets/sharing-prototype/model/prototype-store';
import { reviewableRequests } from '@/widgets/sharing-prototype/model/prototype-transfers';
import { PERSON_SIDEBAR } from '@/widgets/sharing-prototype/model/sidebar-fixtures';
import type {
  PrototypeWorkspace,
  ResourceKind,
  SidebarChat,
} from '@/widgets/sharing-prototype/model/types';

interface NavItem {
  title: string;
  icon: ComponentType;
  to: '/chat' | '/workspaces' | '/skills' | '/knowledge-bases' | null;
  exact?: boolean;
  requests?: ResourceKind;
  isMarketplace?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Neuer Chat', icon: Plus, to: '/chat', exact: true },
  {
    title: 'Arbeitsbereiche',
    icon: FolderOpen,
    to: '/workspaces',
    exact: true,
  },
  { title: 'Fähigkeiten', icon: Sparkles, to: '/skills', requests: 'skill' },
  {
    title: 'Wissen',
    icon: Brain,
    to: '/knowledge-bases',
    requests: 'knowledge',
  },
  { title: 'Marketplace', icon: Store, to: null, isMarketplace: true },
  { title: 'Academy', icon: GraduationCap, to: null },
];

function useOpenRequestCount(): (resource: ResourceKind) => number {
  const { role, requests } = usePrototypeState();
  const person = personForRole(role);
  return (resource) =>
    reviewableRequests(requests, resource, person, role).length;
}

function RequestBadge({ count }: Readonly<{ count: number }>) {
  if (count === 0) return null;
  return (
    <SidebarMenuBadge
      aria-label={`${count} offene Anfragen`}
      className="rounded-full bg-brand text-brand-foreground peer-hover/menu-button:text-brand-foreground peer-data-[active=true]/menu-button:text-brand-foreground"
    >
      {count}
    </SidebarMenuBadge>
  );
}

function MainNavigation() {
  const { pathname } = useLocation();
  const { role } = usePrototypeState();
  const openRequests = useOpenRequestCount();
  const mayUseMarketplace = useHasPermission(
    role,
    'install_marketplace_skills',
  );
  const items = NAV_ITEMS.filter(
    (item) => !item.isMarketplace || mayUseMarketplace,
  );

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            {item.to ? (
              <SidebarMenuButton
                asChild
                isActive={
                  item.exact
                    ? pathname === item.to
                    : pathname.startsWith(item.to)
                }
              >
                <Link to={item.to}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton>
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            )}
            {item.requests && (
              <RequestBadge count={openRequests(item.requests)} />
            )}
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function ChatItems({ chats }: Readonly<{ chats: SidebarChat[] }>) {
  return chats.map((chat) => (
    <SidebarMenuItem key={chat.id}>
      <SidebarMenuButton>
        <MessageCircle />
        <span className="truncate">{chat.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  ));
}

function FavoriteWorkspaceItem({
  workspace,
}: Readonly<{ workspace: PrototypeWorkspace }>) {
  const { pathname } = useLocation();
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === `/workspaces/${workspace.id}`}
      >
        <Link
          to="/workspaces/$workspaceId"
          params={{ workspaceId: workspace.id }}
        >
          <WorkspaceIcon
            icon={workspace.icon}
            color={workspace.color}
            variant="plain"
            className="size-4"
          />
          <span className="truncate">{workspace.name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function FavoritesGroup({ personId }: Readonly<{ personId: string }>) {
  const state = usePrototypeState();
  const workspaces = allWorkspaces();
  const favorites = favoriteWorkspaceIdsOf(state, personId).flatMap(
    (id) =>
      workspaces.find(
        (candidate) =>
          candidate.id === id &&
          workspaceMemberIds(candidate).includes(personId),
      ) ?? [],
  );

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Favoriten</SidebarGroupLabel>
      <SidebarMenu>
        {favorites.map((workspace) => (
          <FavoriteWorkspaceItem key={workspace.id} workspace={workspace} />
        ))}
        <ChatItems chats={PERSON_SIDEBAR[personId].favoriteChats} />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function ChatsGroup({ personId }: Readonly<{ personId: string }>) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="flex items-center justify-between">
        <span>Chats</span>
        <Search className="size-4 text-muted-foreground" />
      </SidebarGroupLabel>
      <SidebarMenu>
        <ChatItems chats={PERSON_SIDEBAR[personId].chats} />
      </SidebarMenu>
    </SidebarGroup>
  );
}

function UserMenu() {
  const { role } = usePrototypeState();
  const person = personForRole(role);
  const canManage = managedTeams(person, role).length > 0;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <User2 className="size-4" />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{person.name}</span>
                <span className="truncate text-xs">{person.email}</span>
              </div>
              <ChevronUp className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuItem>
              <User2 />
              Konto
            </DropdownMenuItem>
            {canManage && (
              <DropdownMenuItem asChild>
                <Link to="/admin-settings/teams">
                  <Building2 />
                  Organisation
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem>
              <LogOut />
              Abmelden
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export function PrototypeSidebar() {
  const { theme } = useTheme();
  const { role } = usePrototypeState();
  const person = personForRole(role);

  return (
    <Sidebar variant="inset" data-testid="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex h-12 w-full items-center p-2">
              <Link to="/" aria-label="Ayunis Core" className="inline-flex">
                <img
                  src={theme === 'dark' ? brandFullDark : brandFullLight}
                  alt="Ayunis Logo"
                  className="w-full max-w-32"
                />
              </Link>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <MainNavigation />
        <FavoritesGroup personId={person.id} />
        <ChatsGroup personId={person.id} />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}
