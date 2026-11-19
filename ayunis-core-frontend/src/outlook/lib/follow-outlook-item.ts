import type { AppRouter } from '@/app/app-router';
import type { ItemChats } from '@/outlook/lib/item-chats';

export type FollowedRouter = Pick<AppRouter, 'navigate' | 'subscribe'>;

declare module '@tanstack/react-router' {
  interface HistoryState {
    /** The email a pane's new chat is for; see `followOutlookItem`. */
    paneItem?: string;
  }
}

interface FollowOutlookItemParams {
  router: FollowedRouter;
  chats: ItemChats;
  /** The email the pane is on, or null for a draft or no selection. */
  currentItemKey: () => string | null;
  /** Calls the listener when the user selects another item; returns the unsubscribe. */
  watchItem: (listener: () => void) => () => void;
  /**
   * Calls `onStart` when the chat app starts creating a chat, and the
   * function it returns with the new chat's id, or no id on failure.
   */
  watchNewChats: (onStart: () => (threadId?: string) => void) => () => void;
  chatExists: (threadId: string) => Promise<boolean>;
  /** Tells the chat app which email a chat it opens is for. */
  rememberChatItem: (threadId: string, itemKey: string) => void;
}

interface ChatOpening {
  itemKey: string;
  threadId: string | undefined;
  exists?: boolean;
  pendingCreates: number;
}

const CHAT_PATH = /^\/chats\/([^/]+)$/;

/**
 * Gives each email in a pinned pane its own chat: selecting an email reopens
 * the chat last shown for it, or a new chat. A draft or an empty selection
 * keeps the open chat. Only a chat that was opened or started replaces an
 * email's chat; showing a new, still empty chat does not.
 */
export function followOutlookItem({
  router,
  chats,
  currentItemKey,
  watchItem,
  watchNewChats,
  chatExists,
  rememberChatItem,
}: FollowOutlookItemParams): () => void {
  let opening: ChatOpening | undefined;

  async function open(itemKey: string): Promise<void> {
    const threadId = chats.chatFor(itemKey);
    const attempt: ChatOpening = { itemKey, threadId, pendingCreates: 0 };
    opening = attempt;
    attempt.exists = threadId !== undefined && (await chatExists(threadId));
    showOpenedChat(attempt);
  }

  function showOpenedChat(attempt: ChatOpening): void {
    const { itemKey, threadId, exists, pendingCreates } = attempt;
    // A send started during the lookup gets first chance to open its chat.
    if (opening !== attempt || exists === undefined || pendingCreates > 0) {
      return;
    }
    opening = undefined;
    // Another pane of the user remembered a newer chat for this email.
    if (chats.chatFor(itemKey) !== threadId) return;
    if (threadId !== undefined && !exists) chats.forget(itemKey);
    // A reply started meanwhile still belongs to this email.
    if (contextItemKey() !== itemKey) return;
    // The chat app's record does not survive a reload; the map does.
    if (exists && threadId !== undefined) {
      rememberChatItem(threadId, itemKey);
      void router.navigate({ to: '/chats/$threadId', params: { threadId } });
      return;
    }
    // The email in the state makes each email's new chat its own location:
    // the router reuses the page for an identical one, and with it the text
    // typed for the previous email.
    void router.navigate({ to: '/chat', state: { paneItem: itemKey } });
  }

  // A draft or an empty selection keeps the pane on the email it showed, so
  // what happens there (a chat started while replying) belongs to that email.
  let shownItemKey = currentItemKey();
  const contextItemKey = () => currentItemKey() ?? shownItemKey;

  // A chat belongs to the email selected when it was started or when the
  // navigation to it started, not when it finally shows: creating a chat and
  // loading a chat page both take a moment the user may spend switching.
  const startedChats = new Map<string, string | null>();
  const stopNewChats = watchNewChats(() => {
    const itemKey = contextItemKey();
    const attempt = opening;
    if (attempt) attempt.pendingCreates += 1;
    return (threadId) => {
      if (threadId !== undefined) {
        startedChats.set(threadId, itemKey);
        if (opening === attempt) opening = undefined;
        return;
      }
      if (!attempt) return;
      attempt.pendingCreates -= 1;
      showOpenedChat(attempt);
    };
  });
  const startedOn = new Map<string, string | null>();
  const stopNoting = router.subscribe('onBeforeNavigate', ({ toLocation }) => {
    if (CHAT_PATH.test(toLocation.pathname)) opening = undefined;
    startedOn.set(toLocation.href, contextItemKey());
  });
  const stopRecording = router.subscribe('onResolved', ({ toLocation }) => {
    const navigatedOn = startedOn.has(toLocation.href)
      ? startedOn.get(toLocation.href)
      : contextItemKey();
    startedOn.delete(toLocation.href);
    const threadId = CHAT_PATH.exec(toLocation.pathname)?.[1];
    if (!threadId) return;
    const startedFor = startedChats.get(threadId);
    startedChats.delete(threadId);
    const itemKey = startedFor === undefined ? navigatedOn : startedFor;
    if (itemKey) chats.remember(itemKey, threadId);
    // The chat app opens a chat it created even if the user selected another
    // email meanwhile; the pane goes back to that email's chat.
    const current = currentItemKey();
    if (startedFor !== undefined && current && current !== itemKey) {
      void open(current);
    }
  });
  const stopWatching = watchItem(() => {
    const itemKey = currentItemKey();
    // Back from a reply to the same email: keep what the pane shows.
    if (!itemKey || itemKey === shownItemKey) return;
    shownItemKey = itemKey;
    void open(itemKey);
  });
  const itemKey = currentItemKey();
  if (itemKey && chats.chatFor(itemKey)) void open(itemKey);

  return () => {
    opening = undefined;
    stopWatching();
    stopNewChats();
    stopNoting();
    stopRecording();
  };
}
