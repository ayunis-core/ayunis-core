import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@ayunis/ui/components/sidebar';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameThreadDialog } from '@/widgets/rename-thread-dialog';
import {
  WorkspaceDeleteDialog,
  WorkspaceSettingsDialog,
} from '@/widgets/workspace-settings-dialog';
import { useDeleteThread } from '@/features/thread-run';
import { useWorkspaces, type Workspace } from '@/features/workspaces';
import { useFavorites, type Favorite } from '@/features/favorites';
import { moveById } from '@/shared/lib/move-by-id';
import { useReorderFavorites } from '@/widgets/app-sidebar/api/useReorderFavorites';
import { applyPendingOrder } from '@/widgets/app-sidebar/lib/applyPendingOrder';
import { FavoriteSidebarItem } from './FavoriteSidebarItem';

export function FavoritesSidebarGroup() {
  const { t } = useTranslation('common');
  const { favorites } = useFavorites();
  const { workspaces } = useWorkspaces();
  const { mutate: reorder } = useReorderFavorites();
  const { confirm } = useConfirmation();
  const { deleteChat } = useDeleteThread({});
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [settingsWorkspace, setSettingsWorkspace] = useState<Workspace | null>(
    null,
  );
  const [workspaceToDelete, setWorkspaceToDelete] = useState<Workspace | null>(
    null,
  );
  const [threadToRename, setThreadToRename] = useState<{
    id: string;
    title: string | null;
  } | null>(null);
  const inFlightRef = useRef(false);
  const queuedOrderRef = useRef<string[] | null>(null);
  const items = pendingOrder
    ? applyPendingOrder(favorites, pendingOrder)
    : favorites;
  const workspaceById = new Map(
    workspaces.map((workspace) => [workspace.id, workspace]),
  );
  if (items.length === 0) return null;

  function submitOrder(favoriteIds: string[]) {
    inFlightRef.current = true;
    reorder(
      { data: { favoriteIds } },
      {
        onSuccess: () => {
          const queued = queuedOrderRef.current;
          queuedOrderRef.current = null;
          if (queued) return submitOrder(queued);
          inFlightRef.current = false;
          setPendingOrder(null);
        },
        onError: () => {
          queuedOrderRef.current = null;
          inFlightRef.current = false;
          setPendingOrder(null);
        },
      },
    );
  }

  function applyOrder(next: Favorite[]) {
    const favoriteIds = next.map((item) => item.id);
    setPendingOrder(favoriteIds);
    if (inFlightRef.current) queuedOrderRef.current = favoriteIds;
    else submitOrder(favoriteIds);
  }

  function handleMove(itemId: string, direction: 'up' | 'down') {
    const index = items.findIndex((item) => item.id === itemId);
    const targetIndex = index + (direction === 'up' ? -1 : 1);
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
    const next = moveById(items, itemId, items[targetIndex].id);
    if (next) applyOrder(next);
  }

  function handleDelete(item: Favorite) {
    if (item.referenceType === 'workspace') {
      const workspace = workspaceById.get(item.referenceId);
      if (workspace) setWorkspaceToDelete(workspace);
      return;
    }
    confirm({
      title: t('sidebar.deleteChatTitle'),
      description: t('sidebar.deleteChatDescription'),
      confirmText: t('sidebar.deleteChatConfirm'),
      cancelText: t('sidebar.deleteChatCancel'),
      variant: 'destructive',
      onConfirm: () => {
        deleteChat(item.referenceId);
        if (params.threadId === item.referenceId)
          void navigate({ to: '/chat' });
      },
    });
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{t('sidebar.pinnedChats')}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item, index) => (
              <FavoriteSidebarItem
                key={item.id}
                item={item}
                workspace={workspaceById.get(item.referenceId)}
                canMoveUp={index > 0}
                canMoveDown={index < items.length - 1}
                onMove={handleMove}
                onRename={(id, title) => setThreadToRename({ id, title })}
                onDelete={handleDelete}
                onOpenWorkspaceSettings={setSettingsWorkspace}
              />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
      {settingsWorkspace && (
        <WorkspaceSettingsDialog
          key={settingsWorkspace.id}
          workspace={settingsWorkspace}
          open
          onOpenChange={(open) => {
            if (!open) setSettingsWorkspace(null);
          }}
        />
      )}
      {workspaceToDelete && (
        <WorkspaceDeleteDialog
          workspace={workspaceToDelete}
          open
          onOpenChange={(open) => {
            if (!open) setWorkspaceToDelete(null);
          }}
          onDeleted={() => {
            if (params.workspaceId === workspaceToDelete.id)
              void navigate({ to: '/chat' });
          }}
        />
      )}
      {threadToRename && (
        <RenameThreadDialog
          open
          onOpenChange={(open) => {
            if (!open) setThreadToRename(null);
          }}
          threadId={threadToRename.id}
          currentTitle={threadToRename.title}
        />
      )}
    </>
  );
}
