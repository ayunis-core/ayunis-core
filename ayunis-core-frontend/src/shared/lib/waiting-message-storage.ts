const WAITING_MESSAGE_STORAGE_PREFIX = 'waiting_message:';

function getStorageKey(chatId: string): string {
  return `${WAITING_MESSAGE_STORAGE_PREFIX}${chatId}`;
}

export function writeWaitingMessage(chatId: string, text: string): void {
  if (text === '') {
    clearWaitingMessage(chatId);
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(chatId), text);
  } catch {
    // The chat must remain usable when browser storage is unavailable.
  }
}

export function clearWaitingMessage(chatId: string): void {
  try {
    window.localStorage.removeItem(getStorageKey(chatId));
  } catch {
    // The chat must remain usable when browser storage is unavailable.
  }
}

export function takeWaitingMessage(chatId: string): string | null {
  try {
    const text = window.localStorage.getItem(getStorageKey(chatId));
    window.localStorage.removeItem(getStorageKey(chatId));
    return text;
  } catch {
    return null;
  }
}
