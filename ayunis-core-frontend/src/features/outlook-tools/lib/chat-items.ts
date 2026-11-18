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
