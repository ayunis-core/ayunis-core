import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { moveById } from '@/shared/lib/move-by-id';
import {
  useReorderWorkspaces,
  useWorkspaces,
  type Workspace,
} from '@/features/workspaces';
import { WorkspaceSettingsDialog } from '@/widgets/workspace-settings-dialog';
import { applyPendingOrder } from '../lib/applyPendingOrder';
import { WorkspaceSidebarItem } from './WorkspaceSidebarItem';

export function WorkspacesSidebarGroup() {
  const { t } = useTranslation('common');
  const { pinnedWorkspaces } = useWorkspaces();
  const { mutate: reorderWorkspaces } = useReorderWorkspaces();
  const [settingsWorkspace, setSettingsWorkspace] = useState<Workspace | null>(
    null,
  );

  // Only the *order* is held locally, and only until the server confirms it.
  // Rendering always maps over the live workspaces, so a rename shows up
  // immediately and there is no server-vs-local list to keep in sync — the
  // pinned subset is a fresh `.filter()` on every render, which makes any
  // identity-based sync loop until React's max-update-depth guard fires.
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  // Rapid moves must not race on the server: two overlapping PATCHes can
  // commit in either order, letting an older order win. Only one request is
  // ever in flight; a drag that lands meanwhile just replaces the queued
  // order, and the queue drains on settle — last drag always wins.
  const inFlightRef = useRef(false);
  const queuedOrderRef = useRef<string[] | null>(null);
  const ordered = pendingOrder
    ? applyPendingOrder(pinnedWorkspaces, pendingOrder)
    : pinnedWorkspaces;

  // `pendingOrder` is released only once the refetched list already shows the
  // same order — releasing on settle would snap back to the stale cache until
  // the invalidated query lands.
  if (
    pendingOrder &&
    !inFlightRef.current &&
    !queuedOrderRef.current &&
    ordered.map((workspace) => workspace.id).join('\n') ===
      pinnedWorkspaces.map((workspace) => workspace.id).join('\n')
  ) {
    setPendingOrder(null);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function submitOrder(ids: string[]) {
    inFlightRef.current = true;
    reorderWorkspaces(ids, {
      onSuccess: () => {
        const queued = queuedOrderRef.current;
        queuedOrderRef.current = null;
        if (queued) {
          submitOrder(queued);
          return;
        }
        inFlightRef.current = false;
      },
      onError: () => {
        // The order did not stick (the hook already toasts); drop everything
        // local and snap back to the server's order.
        queuedOrderRef.current = null;
        inFlightRef.current = false;
        setPendingOrder(null);
      },
    });
  }

  function applyOrder(next: Workspace[]) {
    const ids = next.map((workspace) => workspace.id);
    setPendingOrder(ids);
    if (inFlightRef.current) {
      queuedOrderRef.current = ids;
    } else {
      submitOrder(ids);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const next = moveById(ordered, String(active.id), String(over.id));
    if (next) applyOrder(next);
  }

  function handleMove(workspaceId: string, direction: 'up' | 'down') {
    const index = ordered.findIndex(
      (workspace) => workspace.id === workspaceId,
    );
    const targetIndex = index + (direction === 'up' ? -1 : 1);
    if (index === -1 || targetIndex < 0 || targetIndex >= ordered.length) {
      return;
    }
    const next = moveById(ordered, workspaceId, ordered[targetIndex].id);
    if (next) applyOrder(next);
  }

  if (ordered.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('sidebar.workspaces')}</SidebarGroupLabel>
      <SidebarGroupContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={ordered.map((workspace) => workspace.id)}
            strategy={verticalListSortingStrategy}
          >
            <SidebarMenu>
              {ordered.map((workspace, index) => (
                <WorkspaceSidebarItem
                  key={workspace.id}
                  workspace={workspace}
                  canMoveUp={index > 0}
                  canMoveDown={index < ordered.length - 1}
                  onMove={handleMove}
                  onOpenSettings={setSettingsWorkspace}
                />
              ))}
            </SidebarMenu>
          </SortableContext>
        </DndContext>
      </SidebarGroupContent>

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
    </SidebarGroup>
  );
}
