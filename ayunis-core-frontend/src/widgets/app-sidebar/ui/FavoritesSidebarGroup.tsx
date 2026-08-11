import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
} from '@ayunis/ui/components/sidebar';
import { useConfirmation } from '@/widgets/confirmation-modal';
import { RenameThreadDialog } from '@/widgets/rename-thread-dialog';
import { WorkspaceSettingsDialog } from '@/widgets/workspace-settings-dialog';
import { useDeleteThread } from '@/features/thread-run';
import {
  useDeleteWorkspace,
  useWorkspaces,
  type Workspace,
} from '@/features/workspaces';
import { useFavorites, type Favorite } from '@/features/favorites';
import { moveById } from '@/shared/lib/move-by-id';
import { useThreads } from '../api';
import { useReorderFavorites } from '../api/useReorderFavorites';
import { applyPendingOrder } from '../lib/applyPendingOrder';
import { FavoriteSidebarItem } from './FavoriteSidebarItem';

export function FavoritesSidebarGroup() {
  const { t } = useTranslation('common');
  const { t: tWorkspaces } = useTranslation('workspaces');
  const { favorites } = useFavorites();
  const { workspaces } = useWorkspaces();
  const { mutate: reorder } = useReorderFavorites();
  const { confirm } = useConfirmation();
  const { deleteChat } = useDeleteThread({});
  const { mutate: deleteWorkspace } = useDeleteWorkspace();
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [settingsWorkspace, setSettingsWorkspace] = useState<Workspace | null>(
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
  // Same query the chats group uses (deduped by react-query); supplies each
  // pinned chat's current workspaceId for the project actions in its menu.
  const { threads } = useThreads();
  const threadById = new Map(threads.map((thread) => [thread.id, thread]));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
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

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const next = moveById(items, String(active.id), String(over.id));
    if (next) applyOrder(next);
  }

  function handleMove(itemId: string, direction: 'up' | 'down') {
    const index = items.findIndex((item) => item.id === itemId);
    const targetIndex = index + (direction === 'up' ? -1 : 1);
    if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return;
    const next = moveById(items, itemId, items[targetIndex].id);
    if (next) applyOrder(next);
  }

  function handleDelete(item: Favorite) {
    const isWorkspace = item.referenceType === 'workspace';
    const target = isWorkspace
      ? workspaceById.get(item.referenceId)
      : undefined;
    confirm({
      title: isWorkspace
        ? tWorkspaces('deleteDialog.title')
        : t('sidebar.deleteChatTitle'),
      description: isWorkspace
        ? tWorkspaces('deleteDialog.description', {
            name: target?.name ?? item.name,
          })
        : t('sidebar.deleteChatDescription'),
      confirmText: isWorkspace
        ? tWorkspaces('deleteDialog.confirmText')
        : t('sidebar.deleteChatConfirm'),
      cancelText: isWorkspace
        ? tWorkspaces('deleteDialog.cancelText')
        : t('sidebar.deleteChatCancel'),
      variant: 'destructive',
      onConfirm: () => {
        if (isWorkspace) {
          deleteWorkspace(item.referenceId, {
            onSuccess: () => {
              if (params.workspaceId === item.referenceId)
                void navigate({ to: '/chat' });
            },
          });
        } else {
          deleteChat(item.referenceId);
          if (params.threadId === item.referenceId)
            void navigate({ to: '/chat' });
        }
      },
    });
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>{t('sidebar.pinnedChats')}</SidebarGroupLabel>
        <SidebarGroupContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((item) => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <SidebarMenu>
                {items.map((item, index) => (
                  <FavoriteSidebarItem
                    key={item.id}
                    item={item}
                    workspace={workspaceById.get(item.referenceId)}
                    thread={threadById.get(item.referenceId)}
                    canMoveUp={index > 0}
                    canMoveDown={index < items.length - 1}
                    onMove={handleMove}
                    onRename={(id, title) => setThreadToRename({ id, title })}
                    onDelete={handleDelete}
                    onOpenWorkspaceSettings={setSettingsWorkspace}
                  />
                ))}
              </SidebarMenu>
            </SortableContext>
          </DndContext>
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
