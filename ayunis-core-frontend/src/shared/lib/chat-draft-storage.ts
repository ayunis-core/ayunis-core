const CHAT_DRAFT_STORAGE_PREFIX = 'chat_draft:';

function getStorageKey(chatId: string): string {
  return `${CHAT_DRAFT_STORAGE_PREFIX}${chatId}`;
}

export function readChatDraft(chatId: string): string {
  if (typeof window === 'undefined') return '';

  try {
    return window.localStorage.getItem(getStorageKey(chatId)) ?? '';
  } catch {
    return '';
  }
}

export function clearChatDraft(chatId: string): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(getStorageKey(chatId));
  } catch {
    // The chat must remain usable when browser storage is unavailable.
  }
}

export function writeChatDraft(chatId: string, message: string): void {
  if (message === '') {
    clearChatDraft(chatId);
    return;
  }
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(getStorageKey(chatId), message);
  } catch {
    // The chat must remain usable when browser storage is unavailable.
  }
}
