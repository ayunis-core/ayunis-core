// ponytail: a few hundred entries is plenty for one person's inbox on a device
const DEFAULT_LIMIT = 500;

export interface ItemChats {
  chatFor(itemKey: string): string | undefined;
  remember(itemKey: string, threadId: string): void;
  forget(itemKey: string): void;
}

/**
 * Which chat the pane last showed for each email, on this device and per
 * Ayunis user. Every read and write starts from storage, because several
 * panes of the user share it; the in-memory copy only stands in when the
 * browser blocks third-party storage inside the pane iframe or a write fails.
 */
export function createItemChats(
  userId: string,
  limit = DEFAULT_LIMIT,
): ItemChats {
  const key = `ayunis.outlook.itemChats.${userId}`;
  // A Map keeps insertion order, so the least recently used email comes first.
  let entries = new Map<string, string>();

  // Once a write failed, storage misses entries only the memory has.
  let saved = true;

  function current(): Map<string, string> {
    if (!saved) return entries;
    const stored = load(key);
    if (stored) entries = new Map(Object.entries(stored));
    return entries;
  }

  function save(): void {
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(Object.fromEntries(entries)),
      );
    } catch {
      saved = false;
    }
  }

  return {
    chatFor: (itemKey) => current().get(itemKey),
    remember(itemKey, threadId) {
      const latest = current();
      latest.delete(itemKey);
      latest.set(itemKey, threadId);
      for (const oldest of latest.keys()) {
        if (latest.size <= limit) break;
        latest.delete(oldest);
      }
      save();
    },
    forget(itemKey) {
      if (current().delete(itemKey)) save();
    },
  };
}

/** The stored map, or null when storage cannot be read. */
function load(key: string): Record<string, string> | null {
  try {
    const stored: unknown = JSON.parse(
      window.localStorage.getItem(key) ?? '{}',
    );
    return typeof stored === 'object' && stored !== null
      ? (stored as Record<string, string>)
      : {};
  } catch {
    return null;
  }
}
