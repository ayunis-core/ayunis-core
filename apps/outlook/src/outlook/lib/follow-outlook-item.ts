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

type ItemFollowerParams = Required<
  Omit<FollowOutlookItemParams, 'legacyItemKey' | 'watchItem' | 'watchNewChats'>
> &
  Pick<FollowOutlookItemParams, 'legacyItemKey'>;

class ItemFollower {
  private opening: ChatOpening | undefined;
  // A draft or an empty selection keeps the pane on the email it showed, so
  // what happens there (a chat started while replying) belongs to that email.
  private shownItemKey: string | null;
  private readonly startedOn = new Map<string, string | null>();

  constructor(private readonly params: ItemFollowerParams) {
    this.shownItemKey = params.currentItemKey();
  }

  stop(): void {
    this.opening = undefined;
  }

  // A chat belongs to the email selected when it was started or when the
  // navigation to it started, not when it finally shows: creating a chat and
  // loading a chat page both take a moment the user may spend switching.
  chatStarting(): (threadId?: string) => void {
    const itemKey = this.contextItemKey();
    const attempt = this.opening;
    if (attempt) attempt.pendingCreates += 1;
    return (threadId) => {
      if (threadId !== undefined) {
        this.chatStarted(itemKey, threadId);
        return;
      }
      if (!attempt) return;
      attempt.pendingCreates -= 1;
      this.showOpenedChat(attempt);
    };
  }

  threadOpening(threadId: string): void {
    this.opening = undefined;
    this.startedOn.set(threadId, this.contextItemKey());
  }

  threadOpened(threadId: string): void {
    const navigatedOn = this.startedOn.has(threadId)
      ? this.startedOn.get(threadId)
      : this.contextItemKey();
    this.startedOn.delete(threadId);
    if (navigatedOn && this.params.canRememberChat(navigatedOn)) {
      this.params.chats.remember(navigatedOn, threadId);
    }
  }

  itemChanged(): void {
    const itemKey = this.params.currentItemKey();
    // Back from a reply to the same email: keep what the pane shows.
    if (!itemKey || itemKey === this.shownItemKey) return;
    this.shownItemKey = itemKey;
    void this.open(itemKey);
  }

  async open(itemKey: string): Promise<void> {
    const legacyKey = this.params.legacyItemKey?.();
    const threadId = this.chatForItem(itemKey, legacyKey);
    const attempt: ChatOpening = {
      itemKey,
      legacyKey,
      threadId,
      pendingCreates: 0,
    };
    this.opening = attempt;
    attempt.exists =
      threadId !== undefined && (await this.params.chatExists(threadId));
    this.showOpenedChat(attempt);
  }

  private contextItemKey(): string | null {
    return this.params.currentItemKey() ?? this.shownItemKey;
  }

  private chatForItem(itemKey: string, legacyKey?: string | null) {
    const { chats } = this.params;
    return (
      chats.chatFor(itemKey) ??
      (legacyKey ? chats.chatFor(legacyKey) : undefined)
    );
  }

  private chatStarted(itemKey: string | null, threadId: string): void {
    if (!itemKey) return;
    this.params.chats.remember(itemKey, threadId);
    if (this.opening?.itemKey === itemKey) this.opening = undefined;
  }

  private showOpenedChat(attempt: ChatOpening): void {
    const { itemKey, legacyKey, threadId, exists, pendingCreates } = attempt;
    // A send started during the lookup gets first chance to open its chat.
    if (
      this.opening !== attempt ||
      exists === undefined ||
      pendingCreates > 0
    ) {
      return;
    }
    this.opening = undefined;
    if (this.contextItemKey() !== itemKey) return;
    // Another pane of the user remembered a newer chat for this email.
    if (this.chatForItem(itemKey, legacyKey) !== threadId) return;
    if (threadId === undefined) {
      this.params.navigation.startNewChat(itemKey);
    } else if (exists) {
      this.reopenChat(itemKey, threadId);
    } else {
      this.forgetChat(attempt, threadId);
    }
  }

  private reopenChat(itemKey: string, threadId: string): void {
    const { chats, navigation, rememberChatItem } = this.params;
    if (chats.chatFor(itemKey) !== threadId) chats.remember(itemKey, threadId);
    rememberChatItem(threadId, itemKey);
    navigation.openThread(threadId);
  }

  private forgetChat({ itemKey, legacyKey }: ChatOpening, threadId: string) {
    const { chats, navigation } = this.params;
    chats.forget(itemKey);
    if (legacyKey && chats.chatFor(legacyKey) === threadId) {
      chats.forget(legacyKey);
    }
    // A different email gets its own composer, including a new draft.
    navigation.startNewChat(itemKey);
  }
}

/**
 * Gives each email in a pinned pane its own chat: selecting an email reopens
 * the chat last shown for it, or a new chat. A draft or an empty selection
 * keeps the open chat. Only a chat that was opened or started replaces an
 * email's chat; showing a new, still empty chat does not.
 */
export function followOutlookItem({
  canRememberChat = () => true,
  watchItem,
  watchNewChats,
  ...params
}: FollowOutlookItemParams): () => void {
  const follower = new ItemFollower({ ...params, canRememberChat });
  const { navigation } = params;
  const stopNewChats = watchNewChats(() => follower.chatStarting());
  const stopNoting = navigation.onThreadOpening((threadId) =>
    follower.threadOpening(threadId),
  );
  const stopRecording = navigation.onThreadOpened((threadId) =>
    follower.threadOpened(threadId),
  );
  const stopWatching = watchItem(() => follower.itemChanged());
  const itemKey = params.currentItemKey();
  if (itemKey) void follower.open(itemKey);

  return () => {
    follower.stop();
    stopWatching();
    stopNewChats();
    stopNoting();
    stopRecording();
  };
}
