import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  FolderMinus,
  FolderOpen,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Star,
  Trash,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import { cn } from '@ayunis/ui/lib/cn';
import { CreateWorkspaceDialog } from '@/widgets/create-workspace-dialog';
import { WorkspacePickerMenuWithCreate } from '@/widgets/workspace-picker-menu';
import { useWorkspaces } from '@/features/workspaces';
import { useToggleFavorite } from '@/features/favorites';
import { useIsWorkspacesEnabled } from '@/features/feature-toggles';
import { useAssignThreadToWorkspace } from '../api/useAssignThreadToWorkspace';
import type { GetThreadsResponseDtoItem } from '@/shared/api/generated/ayunisCoreAPI.schemas';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';

interface ChatSidebarItemProps {
  thread: GetThreadsResponseDtoItem;
  isPinned: boolean;
  onRename: (threadId: string, currentTitle: string | null) => void;
  onDelete: (threadId: string) => void;
}

export function ChatSidebarItem({
  thread,
  isPinned,
  onRename,
  onDelete,
}: Readonly<ChatSidebarItemProps>) {
  const { t } = useTranslation('common');
  const params = useParams({ strict: false });
  const isWorkspacesEnabled = useIsWorkspacesEnabled();
  const { workspaces } = useWorkspaces();
  const { toggle: togglePinned } = useToggleFavorite();
  const { mutate: assignToWorkspace } = useAssignThreadToWorkspace();
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();

  return (
    <>
      <SidebarMenuItem data-testid="chat">
        <SidebarMenuButton asChild isActive={params.threadId === thread.id}>
          <Link to="/chats/$threadId" params={{ threadId: thread.id }}>
            <MessageCircle />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate">
                {thread.title ?? t('sidebar.untitled')}
              </span>
            </div>
          </Link>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="dropdown-menu-trigger" asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal />
              <span className="sr-only">{t('sidebar.more')}</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="rounded-lg"
            side="bottom"
            align="end"
            data-testid="chat-dropdown"
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            <DropdownMenuItem
              onClick={() =>
                requestDialogOpen(() =>
                  onRename(thread.id, thread.title ?? null),
                )
              }
              data-testid="rename"
            >
              <Pencil />
              <span>{t('sidebar.renameChat')}</span>
            </DropdownMenuItem>

            {isWorkspacesEnabled && (
              <>
                <DropdownMenuItem
                  onClick={() => togglePinned('thread', thread.id)}
                >
                  <Star className={cn(isPinned && 'fill-brand text-brand')} />
                  <span>
                    {isPinned ? t('sidebar.unpinChat') : t('sidebar.pinChat')}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderOpen />
                    <span>{t('sidebar.addToWorkspace')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <WorkspacePickerMenuWithCreate
                      workspaces={workspaces}
                      selectedWorkspaceId={thread.workspaceId}
                      onSelect={(workspace) =>
                        assignToWorkspace({
                          threadId: thread.id,
                          workspaceId: workspace.id,
                        })
                      }
                      onCreateNew={() =>
                        requestDialogOpen(() => setIsCreateWorkspaceOpen(true))
                      }
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {thread.workspaceId && (
                  <DropdownMenuItem
                    onClick={() =>
                      assignToWorkspace({
                        threadId: thread.id,
                        workspaceId: null,
                      })
                    }
                  >
                    <FolderMinus />
                    <span>{t('sidebar.removeFromWorkspace')}</span>
                  </DropdownMenuItem>
                )}
              </>
            )}

            <DropdownMenuItem
              variant="destructive"
              onClick={() => requestDialogOpen(() => onDelete(thread.id))}
              data-testid="delete"
            >
              <Trash />
              <span>{t('sidebar.deleteChat')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>

      {isCreateWorkspaceOpen && (
        <CreateWorkspaceDialog
          open={isCreateWorkspaceOpen}
          onOpenChange={setIsCreateWorkspaceOpen}
          onCreated={(workspace) =>
            assignToWorkspace({
              threadId: thread.id,
              workspaceId: workspace.id,
            })
          }
        />
      )}
    </>
  );
}
