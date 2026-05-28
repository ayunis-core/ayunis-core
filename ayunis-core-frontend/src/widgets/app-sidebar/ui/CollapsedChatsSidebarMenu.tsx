import { Loader2, MessageCircle, Search } from 'lucide-react';
import { Link, useLocation, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import { useThreads } from '../api';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/shared/ui/shadcn/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/shared/ui/shadcn/dropdown-menu';

const RECENT_CHATS_LIMIT = 10;

export function CollapsedChatsSidebarMenu() {
  const { t } = useTranslation('common');
  const { threads, isLoading } = useThreads();
  const location = useLocation();
  const params = useParams({ strict: false });
  const recentThreads = threads.slice(0, RECENT_CHATS_LIMIT);
  const isOnChatsRoute = location.pathname.startsWith('/chats');

  return (
    <SidebarGroup>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            asChild
            tooltip={t('sidebar.allChats')}
            isActive={location.pathname === '/chats'}
          >
            <Link to="/chats">
              <Search />
              <span>{t('sidebar.chats')}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                tooltip={t('sidebar.recentChats')}
                isActive={isOnChatsRoute && Boolean(params.threadId)}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <MessageCircle />
                <span>{t('sidebar.chats')}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-56 max-w-56 rounded-lg"
              side="right"
              align="start"
              sideOffset={4}
            >
              <DropdownMenuLabel className="truncate px-2 py-1.5 text-sm font-semibold">
                {t('sidebar.recentChats')}
              </DropdownMenuLabel>
              {isLoading && (
                <DropdownMenuItem disabled className="gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  {t('sidebar.loadingChats')}
                </DropdownMenuItem>
              )}
              {!isLoading && recentThreads.length === 0 && (
                <DropdownMenuItem disabled className="text-muted-foreground">
                  {t('sidebar.emptyChatsTitle')}
                </DropdownMenuItem>
              )}
              {!isLoading &&
                recentThreads.map((thread) => (
                  <DropdownMenuItem
                    key={thread.id}
                    asChild
                    className="min-w-0 max-w-full"
                  >
                    <Link
                      to="/chats/$threadId"
                      params={{ threadId: thread.id }}
                      className="flex w-full min-w-0 cursor-pointer"
                    >
                      <span className="block min-w-0 flex-1 truncate">
                        {thread.title ?? t('sidebar.untitled')}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}
