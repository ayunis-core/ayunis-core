/**
 * Applies a pending drag order to the current items. Ids that have since
 * disappeared are skipped and newly appeared ones are appended, so an in-flight
 * reorder can never hide or duplicate an item.
 */
export function applyPendingOrder<T extends { id: string }>(
  items: T[],
  pendingIds: string[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const ranked = [...new Set(pendingIds)]
    .map((id) => byId.get(id))
    .filter((item): item is T => item !== undefined);
  const rankedIds = new Set(ranked.map((item) => item.id));
  return [...ranked, ...items.filter((item) => !rankedIds.has(item.id))];
}
