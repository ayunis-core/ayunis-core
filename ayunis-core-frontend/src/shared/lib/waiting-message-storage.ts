const WAITING_MESSAGE_STORAGE_PREFIX = 'waiting_message:';
let ownerPrefix: string | undefined;

export function setWaitingMessagePrincipal(
  principal: string | undefined,
): void {
  ownerPrefix =
    principal === undefined
      ? undefined
      : `${WAITING_MESSAGE_STORAGE_PREFIX}${encodeURIComponent(principal)}:`;
}

function getStorageKey(chatId: string): string | undefined {
  if (ownerPrefix !== undefined) return ownerPrefix + chatId;
}

export function writeWaitingMessage(chatId: string, text: string): void {
  if (text === '') {
    clearWaitingMessage(chatId);
    return;
  }

  const key = getStorageKey(chatId);
  if (key === undefined) return;
  try {
    window.localStorage.setItem(key, text);
  } catch {
    // The chat must remain usable when browser storage is unavailable.
  }
}

export function clearWaitingMessage(chatId: string): void {
  const key = getStorageKey(chatId);
  if (key === undefined) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // The chat must remain usable when browser storage is unavailable.
  }
}

export function takeWaitingMessage(chatId: string): string | null {
  const key = getStorageKey(chatId);
  if (key === undefined) return null;
  try {
    const text = window.localStorage.getItem(key);
    window.localStorage.removeItem(key);
    return text;
  } catch {
    return null;
  }
}

export function clearWaitingMessages(): void {
  try {
    const storage = window.localStorage;
    for (let index = storage.length - 1; index >= 0; index--) {
      const key = storage.key(index);
      if (key?.startsWith(WAITING_MESSAGE_STORAGE_PREFIX)) {
        storage.removeItem(key);
      }
    }
  } catch {
    // The chat must remain usable when browser storage is unavailable.
  }
}
