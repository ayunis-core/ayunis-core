import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  StarOff,
  Trash,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@ayunis/ui/components/dropdown-menu';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@ayunis/ui/components/sidebar';
import { WorkspaceIcon } from '@/shared/ui/workspace-icon';
import {
  ChatWorkspaceSubmenu,
  CreateChatWorkspaceDialog,
} from '@/widgets/chat-workspace-menu';
import { useToggleFavorite, type Favorite } from '@/features/favorites';
import { getWorkspaceAccess, type Workspace } from '@/features/workspaces';
import { useDropdownDialogTransition } from '@/shared/hooks/useDropdownDialogTransition';
import { trackOpenPanelEvent } from '@/shared/lib/openpanel-events';

interface FavoriteSidebarItemProps {
  item: Favorite;
  workspace: Workspace | undefined;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (itemId: string, direction: 'up' | 'down') => void;
  onRename: (threadId: string, title: string | null) => void;
  onDelete: (item: Favorite) => void;
  onOpenWorkspaceSettings: (workspace: Workspace) => void;
  isRunning?: boolean;
}

function FavoriteThreadIcon({ isRunning }: Readonly<{ isRunning: boolean }>) {
  const { t } = useTranslation('common');
  return isRunning ? (
    <Loader2
      className="animate-spin"
      data-testid="chat-running-indicator"
      aria-label={t('sidebar.chatRunning')}
    />
  ) : (
    <MessageCircle />
  );
}

function FavoriteIcon({
  item,
  isRunning,
}: Readonly<{ item: Favorite; isRunning: boolean }>) {
  switch (item.referenceType) {
    case 'workspace':
      return (
        <WorkspaceIcon
          icon={item.icon}
          color={item.color}
          variant="plain"
          // Collapse the icon's box to the glyph so workspace rows line up
          // with the chat rows' bare 16px lucide icon.
          className="size-4"
        />
      );
    case 'routine':
      return <CalendarClock />;
    case 'thread':
      return <FavoriteThreadIcon isRunning={isRunning} />;
  }
}

function favoriteRoute(item: Favorite) {
  switch (item.referenceType) {
    case 'workspace':
      return {
        to: '/workspaces/$workspaceId',
        params: { workspaceId: item.referenceId },
      } as const;
    case 'routine':
      return {
        to: '/routines/$routineId',
        params: { routineId: item.referenceId },
      } as const;
    case 'thread':
      return {
        to: '/chats/$threadId',
        params: { threadId: item.referenceId },
      } as const;
  }
}

const UNPIN_LABEL_KEYS = {
  workspace: 'sidebar.unpinWorkspace',
  thread: 'sidebar.unpinChat',
  routine: 'sidebar.unpinRoutine',
} as const;

export function FavoriteSidebarItem({
  item,
  workspace,
  canMoveUp,
  canMoveDown,
  onMove,
  onRename,
  onDelete,
  onOpenWorkspaceSettings,
  isRunning = false,
}: Readonly<FavoriteSidebarItemProps>) {
  const { t } = useTranslation('common');
  const { t: tWorkspaces } = useTranslation('workspaces');
  const params = useParams({ strict: false });
  const { toggle } = useToggleFavorite();
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const { requestDialogOpen, handleCloseAutoFocus } =
    useDropdownDialogTransition();
  const isWorkspace = item.referenceType === 'workspace';
  const isThread = item.referenceType === 'thread';
  const threadWorkspaceId = isThread ? item.workspaceId : undefined;
  const title = item.name ?? t('sidebar.untitled');
  const access = workspace ? getWorkspaceAccess(workspace) : undefined;
  const canEditWorkspace = !!workspace && !!access?.canManage;
  const activeReferenceId = {
    workspace: params.workspaceId,
    thread: params.threadId,
    routine: params.routineId,
  }[item.referenceType];

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={activeReferenceId === item.referenceId}
        >
          <Link
            {...favoriteRoute(item)}
            onClick={() =>
              trackOpenPanelEvent('favorite_opened', {
                resource_type: item.referenceType,
              })
            }
          >
            <FavoriteIcon item={item} isRunning={isRunning} />
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
            collisionPadding={8}
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            {isWorkspace && workspace && access?.canManage && (
              <DropdownMenuItem
                onClick={() =>
                  requestDialogOpen(() => onOpenWorkspaceSettings(workspace))
                }
              >
                <Pencil />
                <span>{tWorkspaces('actions.edit')}</span>
              </DropdownMenuItem>
            )}
            {isThread && (
              <DropdownMenuItem
                onClick={() =>
                  requestDialogOpen(() => onRename(item.referenceId, item.name))
                }
              >
                <Pencil />
                <span>{t('sidebar.renameChat')}</span>
              </DropdownMenuItem>
            )}
            {(isThread || canEditWorkspace) && <DropdownMenuSeparator />}
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
              <span>{t(UNPIN_LABEL_KEYS[item.referenceType])}</span>
            </DropdownMenuItem>
            {isThread && (
              <ChatWorkspaceSubmenu
                threadId={item.referenceId}
                workspaceId={threadWorkspaceId}
                onCreateNew={() =>
                  requestDialogOpen(() => setIsCreateWorkspaceOpen(true))
                }
              />
            )}
            {(isThread || (isWorkspace && access?.isAdmin)) && (
              <DropdownMenuItem
                onClick={() => requestDialogOpen(() => onDelete(item))}
                variant="destructive"
              >
                <Trash />
                <span>
                  {isWorkspace
                    ? tWorkspaces('actions.delete')
                    : t('sidebar.deleteChat')}
                </span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
      <CreateChatWorkspaceDialog
        threadId={item.referenceId}
        open={isCreateWorkspaceOpen}
        onOpenChange={setIsCreateWorkspaceOpen}
      />
    </>
  );
}
