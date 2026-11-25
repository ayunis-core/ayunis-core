/**
 * The mail each chat is about: the one its runs started on. Kept for the
 * page's lifetime, so a chat reopened after switching chats can tell whether
 * the open mail is still the one it was talking about. A reload forgets it.
 */
const chatItems = new Map<string, string | null>();

export function rememberChatItem(threadId: string, itemKey: string | null) {
  chatItems.set(threadId, itemKey);
}

export function chatItemKey(threadId: string): string | null | undefined {
  return chatItems.get(threadId);
}

interface DraftSource {
  callId: string;
  itemKey: string | null;
}

const DRAFT_SOURCES_KEY = 'ayunis.outlook.draftSources';
const MAX_DRAFT_SOURCES = 500;

function storedDraftSources(): Partial<Record<string, DraftSource>> {
  try {
    const saved: unknown = JSON.parse(
      localStorage.getItem(DRAFT_SOURCES_KEY) ?? '{}',
    );
    return typeof saved === 'object' && saved !== null && !Array.isArray(saved)
      ? saved
      : {};
  } catch {
    return {};
  }
}

/** The compose pane may open in another page, so retain the latest draft's
 * source alongside the thread ID, even if the email associated with the
 * chat later changes. No draft text is stored here.
 */
export function rememberOutlookDraftSource(
  threadId: string,
  callId: string,
  itemKey: string | null,
): void {
  const entries = Object.entries(storedDraftSources()).filter(
    ([id]) => id !== threadId,
  );
  entries.push([threadId, { callId, itemKey }]);
  try {
    localStorage.setItem(
      DRAFT_SOURCES_KEY,
      JSON.stringify(Object.fromEntries(entries.slice(-MAX_DRAFT_SOURCES))),
    );
  } catch {
    // The pane's in-memory call associations still work with storage blocked.
  }
}

export function outlookDraftSource(
  threadId: string,
  callId: string,
): string | null | undefined {
  const source = storedDraftSources()[threadId];
  return source?.callId === callId ? source.itemKey : undefined;
}
