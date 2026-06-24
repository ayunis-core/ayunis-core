import { arrayMove } from '@dnd-kit/sortable';

/**
 * Moves the item with `activeId` to the position of the item with `overId`.
 * Returns null when nothing changes (unknown ids or same position).
 */
export function moveById<T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string,
): T[] | null {
  if (activeId === overId) return null;
  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);
  if (oldIndex === -1 || newIndex === -1) return null;
  return arrayMove(items, oldIndex, newIndex);
}
