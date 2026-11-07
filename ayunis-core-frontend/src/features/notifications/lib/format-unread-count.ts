const MAX_SHOWN_COUNT = 99;

/** The sidebar badge text; null hides the badge. */
export function formatUnreadCount(count: number): string | null {
  if (count <= 0) return null;
  return count > MAX_SHOWN_COUNT ? `${MAX_SHOWN_COUNT}+` : String(count);
}
