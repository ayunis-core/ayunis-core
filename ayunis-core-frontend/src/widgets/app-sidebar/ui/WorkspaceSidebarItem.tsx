import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Loader2 } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@ayunis/ui/components/collapsible';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@ayunis/ui/components/sidebar';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import type { Workspace } from '@/features/workspaces';
import { useWorkspaceThreads } from '@/widgets/app-sidebar/api';

interface WorkspaceSidebarItemProps {
  workspace: Workspace;
}

export function WorkspaceSidebarItem({
  workspace,
}: Readonly<WorkspaceSidebarItemProps>) {
  const { t } = useTranslation('common');
  const params = useParams({ strict: false });
  const [isOpen, setIsOpen] = useState(false);
  const { threads, hasMore, isLoading } = useWorkspaceThreads(
    workspace.id,
    isOpen,
  );

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/workspace"
      asChild
    >
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={params.workspaceId === workspace.id}
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
        <CollapsibleTrigger asChild>
          <SidebarMenuAction
            data-testid={`sidebar-workspace-toggle-${workspace.id}`}
          >
            <ChevronRight className="transition-transform group-data-[state=open]/workspace:rotate-90" />
            <span className="sr-only">{t('sidebar.workspaceChats')}</span>
          </SidebarMenuAction>
        </CollapsibleTrigger>
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
                    params={{ workspaceId: workspace.id }}
                    className="text-muted-foreground"
                  >
                    <span>{t('sidebar.showMore')}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}
