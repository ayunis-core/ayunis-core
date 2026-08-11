import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  FolderMinus,
  FolderOpen,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Settings2,
  StarOff,
  Trash,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import { CreateWorkspaceDialog } from '@/widgets/create-workspace-dialog';
import { WorkspacePickerMenuWithCreate } from '@/widgets/workspace-picker-menu';
import { useToggleFavorite, type Favorite } from '@/features/favorites';
import { useWorkspaces, type Workspace } from '@/features/workspaces';
import { useAssignThreadToWorkspace } from '../api/useAssignThreadToWorkspace';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';

interface FavoriteSidebarItemProps {
  item: Favorite;
  workspace: Workspace | undefined;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (itemId: string, direction: 'up' | 'down') => void;
  onRename: (threadId: string, title: string | null) => void;
  onDelete: (item: Favorite) => void;
  onOpenWorkspaceSettings: (workspace: Workspace) => void;
}

export function FavoriteSidebarItem({
  item,
  workspace,
  canMoveUp,
  canMoveDown,
  onMove,
  onRename,
  onDelete,
  onOpenWorkspaceSettings,
}: Readonly<FavoriteSidebarItemProps>) {
  const { t } = useTranslation('common');
  const params = useParams({ strict: false });
  const { toggle } = useToggleFavorite();
  const { workspaces } = useWorkspaces();
  const { mutate: assignToWorkspace } = useAssignThreadToWorkspace();
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();
  const isWorkspace = item.referenceType === 'workspace';
  const threadWorkspaceId =
    item.referenceType === 'thread' ? item.workspaceId : undefined;
  const title = item.name ?? t('sidebar.untitled');

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={
            isWorkspace
              ? params.workspaceId === item.referenceId
              : params.threadId === item.referenceId
          }
        >
          <Link
            to={isWorkspace ? '/workspaces/$workspaceId' : '/chats/$threadId'}
            params={
              isWorkspace
                ? { workspaceId: item.referenceId }
                : { threadId: item.referenceId }
            }
          >
            {isWorkspace ? (
              <WorkspaceIcon
                icon={item.icon}
                color={item.color}
                variant="plain"
                // Collapse the icon's box to the glyph so workspace rows line up
                // with the chat rows' bare 16px lucide icon.
                className="size-4"
              />
            ) : (
              <MessageCircle />
            )}
            <span className="truncate">{title}</span>
          </Link>
        </SidebarMenuButton>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuAction showOnHover>
              <MoreHorizontal />
              <span className="sr-only">{t('sidebar.more')}</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="rounded-lg"
            side="bottom"
            align="end"
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            {isWorkspace ? (
              <DropdownMenuItem
                disabled={!workspace}
                onClick={() => {
                  if (workspace) {
                    requestDialogOpen(() => onOpenWorkspaceSettings(workspace));
                  }
                }}
              >
                <Settings2 />
                <span>{t('sidebar.settings')}</span>
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={() =>
                  requestDialogOpen(() => onRename(item.referenceId, item.name))
                }
              >
                <Pencil />
                <span>{t('sidebar.renameChat')}</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!canMoveUp}
              onClick={() => onMove(item.id, 'up')}
            >
              <ArrowUp />
              <span>{t('sidebar.moveUp')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!canMoveDown}
              onClick={() => onMove(item.id, 'down')}
            >
              <ArrowDown />
              <span>{t('sidebar.moveDown')}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => toggle(item.referenceType, item.referenceId)}
            >
              <StarOff />
              <span>
                {isWorkspace
                  ? t('sidebar.unpinWorkspace')
                  : t('sidebar.unpinChat')}
              </span>
            </DropdownMenuItem>
            {!isWorkspace && (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <FolderOpen />
                    <span>{t('sidebar.addToWorkspace')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <WorkspacePickerMenuWithCreate
                      workspaces={workspaces}
                      selectedWorkspaceId={threadWorkspaceId}
                      onSelect={(target) =>
                        assignToWorkspace({
                          threadId: item.referenceId,
                          workspaceId: target.id,
                        })
                      }
                      onCreateNew={() =>
                        requestDialogOpen(() => setIsCreateWorkspaceOpen(true))
                      }
                    />
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {threadWorkspaceId && (
                  <DropdownMenuItem
                    onClick={() =>
                      assignToWorkspace({
                        threadId: item.referenceId,
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
              onClick={() => requestDialogOpen(() => onDelete(item))}
              variant="destructive"
            >
              <Trash />
              <span>
                {isWorkspace
                  ? t('sidebar.deleteWorkspace')
                  : t('sidebar.deleteChat')}
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      {isCreateWorkspaceOpen && (
        <CreateWorkspaceDialog
          open={isCreateWorkspaceOpen}
          onOpenChange={setIsCreateWorkspaceOpen}
          onCreated={(created) =>
            assignToWorkspace({
              threadId: item.referenceId,
              workspaceId: created.id,
            })
          }
        />
      )}
    </>
  );
}
