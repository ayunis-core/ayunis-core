import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { CollapsibleContent } from '@ayunis/ui/components/collapsible';
import {
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@ayunis/ui/components/sidebar';
import { useWorkspaceThreads } from '@/widgets/app-sidebar/api';

interface WorkspaceChatsSubMenuProps {
  workspaceId: string;
  isOpen: boolean;
}

export function WorkspaceChatsSubMenu({
  workspaceId,
  isOpen,
}: Readonly<WorkspaceChatsSubMenuProps>) {
  const { t } = useTranslation('common');
  const params = useParams({ strict: false });
  const { threads, hasMore, isLoading } = useWorkspaceThreads(
    workspaceId,
    isOpen,
  );

  return (
    <CollapsibleContent>
      <SidebarMenuSub>
        {isLoading && (
          <SidebarMenuSubItem>
            <SidebarMenuSubButton className="text-sidebar-foreground/70">
              <Loader2 className="size-4 animate-spin" />
              <span>{t('sidebar.loadingChats')}</span>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )}
        {!isLoading && threads.length === 0 && (
          <SidebarMenuSubItem>
            <span className="px-2 text-xs text-sidebar-foreground/70">
              {t('sidebar.emptyWorkspaceChats')}
            </span>
          </SidebarMenuSubItem>
        )}
        {threads.map((thread) => (
          <SidebarMenuSubItem key={thread.id}>
            <SidebarMenuSubButton
              asChild
              isActive={params.threadId === thread.id}
            >
              <Link to="/chats/$threadId" params={{ threadId: thread.id }}>
                <span className="truncate">
                  {thread.title ?? t('sidebar.untitled')}
                </span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
        {hasMore && (
          <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild>
              <Link
                to="/workspaces/$workspaceId"
                params={{ workspaceId }}
                className="text-muted-foreground"
              >
                <span>{t('sidebar.showMore')}</span>
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        )}
      </SidebarMenuSub>
    </CollapsibleContent>
  );
}
