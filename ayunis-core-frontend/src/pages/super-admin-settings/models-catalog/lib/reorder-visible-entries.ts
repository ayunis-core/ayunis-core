import { arrayMove } from '@dnd-kit/sortable';

/**
 * Moves `activeId` to the position of `overId` among the visible entries.
 * Entries that are not visible (archived models) stay at their index, so
 * un-archiving one later puts it back where it was.
 */
export function reorderVisibleEntries<T extends { modelId: string }>(
  entries: T[],
  visibleIds: string[],
  activeId: string,
  overId: string,
): T[] | null {
  const visible = entries.filter((e) => visibleIds.includes(e.modelId));
  const from = visible.findIndex((e) => e.modelId === activeId);
  const to = visible.findIndex((e) => e.modelId === overId);
  if (from === -1 || to === -1 || from === to) return null;
  const reordered = arrayMove(visible, from, to);
  let next = 0;
  return entries.map((e) =>
    visibleIds.includes(e.modelId) ? reordered[next++] : e,
  );
}
