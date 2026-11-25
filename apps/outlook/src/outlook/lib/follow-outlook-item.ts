import type { ItemChats } from '@/outlook/lib/item-chats';

export interface PaneChatNavigation {
  openThread: (threadId: string) => void;
  startNewChat: (itemKey: string | null) => void;
  onThreadOpening: (listener: (threadId: string) => void) => () => void;
  onThreadOpened: (listener: (threadId: string) => void) => () => void;
}

interface FollowOutlookItemParams {
  navigation: PaneChatNavigation;
  chats: ItemChats;
  /** The selected email or the original email of a known reply. */
  currentItemKey: () => string | null;
  /** Existing device mappings used the read item's EWS ID. */
  legacyItemKey?: () => string | null;
  /** A reply can reopen its original chat without reassigning that chat. */
  canRememberChat?: (itemKey: string) => boolean;
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
  legacyKey?: string | null;
  threadId: string | undefined;
  exists?: boolean;
  pendingCreates: number;
}

/**
 * Gives each email in a pinned pane its own chat: selecting an email reopens
 * the chat last shown for it, or a new chat. A draft or an empty selection
 * keeps the open chat. Only a chat that was opened or started replaces an
 * email's chat; showing a new, still empty chat does not.
 */
export function followOutlookItem({
  navigation,
  chats,
  currentItemKey,
  legacyItemKey,
  canRememberChat = () => true,
  watchItem,
  watchNewChats,
  chatExists,
  rememberChatItem,
}: FollowOutlookItemParams): () => void {
  let opening: ChatOpening | undefined;

  function chatForItem(itemKey: string, legacyKey?: string | null) {
    return (
      chats.chatFor(itemKey) ??
      (legacyKey ? chats.chatFor(legacyKey) : undefined)
    );
  }

  async function open(itemKey: string): Promise<void> {
    const legacyKey = legacyItemKey?.();
    const threadId = chatForItem(itemKey, legacyKey);
    const attempt: ChatOpening = {
      itemKey,
      legacyKey,
      threadId,
      pendingCreates: 0,
    };
    opening = attempt;
    attempt.exists = threadId !== undefined && (await chatExists(threadId));
    showOpenedChat(attempt);
  }

  function showOpenedChat(attempt: ChatOpening): void {
    const { itemKey, legacyKey, threadId, exists, pendingCreates } = attempt;
    // A send started during the lookup gets first chance to open its chat.
    if (opening !== attempt || exists === undefined || pendingCreates > 0) {
      return;
    }
    opening = undefined;
    if (contextItemKey() !== itemKey) return;
    // Another pane of the user remembered a newer chat for this email.
    if (chatForItem(itemKey, legacyKey) !== threadId) return;
    if (exists && threadId !== undefined) {
      if (chats.chatFor(itemKey) !== threadId)
        chats.remember(itemKey, threadId);
      rememberChatItem(threadId, itemKey);
      navigation.openThread(threadId);
      return;
    }
    if (threadId !== undefined) {
      chats.forget(itemKey);
      if (legacyKey && chats.chatFor(legacyKey) === threadId)
        chats.forget(legacyKey);
    }
    // A different email gets its own composer, including a new draft.
    navigation.startNewChat(itemKey);
  }

  // A draft or an empty selection keeps the pane on the email it showed, so
  // what happens there (a chat started while replying) belongs to that email.
  let shownItemKey = currentItemKey();
  const contextItemKey = () => currentItemKey() ?? shownItemKey;

  // A chat belongs to the email selected when it was started or when the
  // navigation to it started, not when it finally shows: creating a chat and
  // loading a chat page both take a moment the user may spend switching.
  const stopNewChats = watchNewChats(() => {
    const itemKey = contextItemKey();
    const attempt = opening;
    if (attempt) attempt.pendingCreates += 1;
    return (threadId) => {
      if (threadId !== undefined) {
        if (itemKey) chats.remember(itemKey, threadId);
        if (opening?.itemKey === itemKey) opening = undefined;
        return;
      }
      if (!attempt) return;
      attempt.pendingCreates -= 1;
      showOpenedChat(attempt);
    };
  });
  const startedOn = new Map<string, string | null>();
  const stopNoting = navigation.onThreadOpening((threadId) => {
    opening = undefined;
    startedOn.set(threadId, contextItemKey());
  });
  const stopRecording = navigation.onThreadOpened((threadId) => {
    const navigatedOn = startedOn.has(threadId)
      ? startedOn.get(threadId)
      : contextItemKey();
    startedOn.delete(threadId);
    if (navigatedOn && canRememberChat(navigatedOn)) {
      chats.remember(navigatedOn, threadId);
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
  if (itemKey) void open(itemKey);

  return () => {
    opening = undefined;
    stopWatching();
    stopNewChats();
    stopNoting();
    stopRecording();
  };
}
