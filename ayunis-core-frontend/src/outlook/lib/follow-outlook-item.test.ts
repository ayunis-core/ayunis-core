import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  followOutlookItem,
  type FollowedRouter,
} from '@/outlook/lib/follow-outlook-item';
import { createItemChats, type ItemChats } from '@/outlook/lib/item-chats';

type RouterEvent = 'onBeforeNavigate' | 'onResolved';
type Listener = (event: {
  toLocation: { pathname: string; href: string };
}) => void;

function setup({
  legacyItemKey,
  existing = new Set(['thread-a', 'thread-b', 'thread-reply']),
  chatExists = (threadId: string) => Promise.resolve(existing.has(threadId)),
}: {
  legacyItemKey?: () => string | null;
  existing?: Set<string>;
  chatExists?: (threadId: string) => Promise<boolean>;
} = {}) {
  let current: string | null = 'read:A';
  let itemChanged = () => undefined as void;
  const listeners = new Map<RouterEvent, Listener>();
  const router = {
    navigate: vi.fn(() => Promise.resolve()),
    subscribe: vi.fn((event: RouterEvent, listener: Listener) => {
      listeners.set(event, listener);
      return () => undefined;
    }),
  };
  let chatStarting: (() => (threadId: string) => void) | undefined;
  const fire = (event: RouterEvent, pathname: string) =>
    listeners.get(event)?.({ toLocation: { pathname, href: pathname } });
  const chats: ItemChats = createItemChats('user-1');
  const chatItems = new Map<string, string>();
  const start = () =>
    followOutlookItem({
      router: router as unknown as FollowedRouter,
      chats,
      currentItemKey: () => current,
      legacyItemKey,
      watchItem: (listener) => {
        itemChanged = listener;
        return () => undefined;
      },
      watchNewChats: (onStart) => {
        chatStarting = onStart;
        return () => undefined;
      },
      chatExists,
      rememberChatItem: (threadId, itemKey) => chatItems.set(threadId, itemKey),
    });
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  return {
    router,
    chats,
    chatItems,
    start,
    flush,
    selectItem: async (key: string | null) => {
      current = key;
      itemChanged();
      await flush();
    },
    /** A navigation that starts and shows while the same email is selected. */
    showRoute: (pathname: string) => {
      fire('onBeforeNavigate', pathname);
      fire('onResolved', pathname);
    },
    /** The chat app starts creating a chat; returns its completion. */
    startNewChat: () => chatStarting?.(),
    startRoute: (pathname: string) => fire('onBeforeNavigate', pathname),
    finishRoute: (pathname: string) => fire('onResolved', pathname),
  };
}

describe('followOutlookItem', () => {
  beforeEach(() => window.localStorage.clear());

  it('reopens an older EWS-keyed chat and makes it available to the matching reply pane', async () => {
    const pane = setup({ legacyItemKey: () => 'read:ews-A' });
    await pane.selectItem('read:internet:<A@example.org>');
    pane.chats.remember('read:ews-A', 'thread-a');
    pane.start();
    await pane.flush();

    expect(pane.router.navigate).toHaveBeenCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-a' },
    });
    expect(pane.chats.chatFor('read:internet:<A@example.org>')).toBe(
      'thread-a',
    );
  });

  it('opens a new chat for an email it has no chat for, and reopens the first email’s chat on return', async () => {
    const pane = setup();
    pane.start();
    pane.showRoute('/chats/thread-a');

    await pane.selectItem('read:B');
    expect(pane.router.navigate).toHaveBeenLastCalledWith({
      to: '/chat',
      state: { paneItem: 'read:B' },
    });
    pane.showRoute('/chat');

    await pane.selectItem('read:A');
    expect(pane.router.navigate).toHaveBeenLastCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-a' },
    });
  });

  it('reopens the email’s chat when the pane opens on it', async () => {
    const pane = setup();
    pane.chats.remember('read:A', 'thread-a');

    pane.start();
    // The router's first route resolves after the pane looked the email up.
    pane.showRoute('/chat');
    await pane.flush();

    expect(pane.router.navigate).toHaveBeenCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-a' },
    });
  });

  // The chat app's own record of a chat's email lives only in memory.
  it('tells the chat app which email a chat it reopens after a reload is for', async () => {
    const pane = setup();
    pane.chats.remember('read:A', 'thread-a');

    pane.start();
    await pane.flush();

    expect(pane.chatItems.get('thread-a')).toBe('read:A');
  });

  // Only a chat that was actually started replaces the email's chat.
  it('keeps an email’s chat when the user only opens a new chat on it', async () => {
    const pane = setup();
    pane.start();
    pane.showRoute('/chats/thread-a');
    pane.showRoute('/chat');

    await pane.selectItem('read:B');
    await pane.selectItem('read:A');

    expect(pane.router.navigate).toHaveBeenLastCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-a' },
    });
  });

  // A draft has no id, and nothing selected has no item: switching there
  // keeps the chat the user was just working in, for example to reply.
  it('stays on the open chat when the pane switches to a draft or to no email', async () => {
    const pane = setup();
    pane.start();
    pane.showRoute('/chats/thread-a');

    await pane.selectItem(null);

    expect(pane.router.navigate).not.toHaveBeenCalled();
  });

  it('opens a new chat when the email’s chat was deleted', async () => {
    const pane = setup({ existing: new Set() });
    pane.start();
    pane.showRoute('/chats/thread-a');
    await pane.selectItem('read:B');

    await pane.selectItem('read:A');

    expect(pane.router.navigate).toHaveBeenLastCalledWith({
      to: '/chat',
      state: { paneItem: 'read:A' },
    });
    expect(pane.chats.chatFor('read:A')).toBeUndefined();
  });

  // A chat page can still be loading when the user selects another email.
  it('remembers a chat for the email it was opened on, not the one selected when it showed', async () => {
    const pane = setup();
    pane.start();
    pane.startRoute('/chats/thread-a');

    await pane.selectItem('read:B');
    pane.startRoute('/chat');
    pane.finishRoute('/chats/thread-a');
    pane.finishRoute('/chat');

    await pane.selectItem('read:A');
    expect(pane.router.navigate).toHaveBeenLastCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-a' },
    });
    expect(pane.chats.chatFor('read:B')).toBeUndefined();
  });

  it('keeps the email’s chat when the user switches away while the pane is still opening it', async () => {
    let answer: ((exists: boolean) => void) | undefined;
    const pane = setup({
      chatExists: () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    });
    pane.chats.remember('read:A', 'thread-a');
    pane.start();
    pane.showRoute('/chat');

    await pane.selectItem('read:B');
    answer?.(true);
    await pane.flush();

    expect(pane.chats.chatFor('read:A')).toBe('thread-a');
  });

  // Creating a chat takes a moment before the chat app opens it.
  it('gives a new chat to the email it was started on and stays on the email selected meanwhile', async () => {
    const pane = setup();
    pane.start();
    pane.showRoute('/chat');
    const created = pane.startNewChat();

    await pane.selectItem('read:B');
    pane.showRoute('/chat');
    created?.('thread-new');
    pane.showRoute('/chats/thread-new');
    await pane.flush();

    expect(pane.chats.chatFor('read:A')).toBe('thread-new');
    expect(pane.chats.chatFor('read:B')).toBeUndefined();
    expect(pane.router.navigate).toHaveBeenLastCalledWith({
      to: '/chat',
      state: { paneItem: 'read:B' },
    });
  });

  // Replying opens a draft, which has no id; the pane stays on the email
  // being read, so a chat started in the draft belongs to that email.
  it('keeps a chat started on the email while its deleted chat was being checked', async () => {
    let answerCheck = (_exists: boolean) => undefined as void;
    const pane = setup({
      chatExists: () =>
        new Promise((resolve) => {
          answerCheck = resolve;
        }),
    });
    pane.chats.remember('read:A', 'thread-deleted');
    pane.start();

    // The composer is usable while the pane checks the remembered chat.
    pane.startNewChat()?.('thread-new');
    pane.showRoute('/chats/thread-new');
    answerCheck(false);
    await pane.flush();

    expect(pane.chats.chatFor('read:A')).toBe('thread-new');
    expect(pane.router.navigate).not.toHaveBeenCalled();
  });

  it('stays on a chat started on the email while its deleted chat was being checked and the new chat is still loading', async () => {
    let answerCheck = (_exists: boolean) => undefined as void;
    const pane = setup({
      chatExists: () =>
        new Promise((resolve) => {
          answerCheck = resolve;
        }),
    });
    pane.chats.remember('read:A', 'thread-deleted');
    pane.start();

    pane.startNewChat()?.('thread-new');
    pane.startRoute('/chats/thread-new');
    answerCheck(false);
    await pane.flush();
    pane.finishRoute('/chats/thread-new');

    expect(pane.router.navigate).not.toHaveBeenCalled();
    expect(pane.chats.chatFor('read:A')).toBe('thread-new');
  });

  it('opens the email’s chat when the user starts a reply while it is being checked', async () => {
    let answerCheck = (_exists: boolean) => undefined as void;
    const pane = setup({
      chatExists: () =>
        new Promise((resolve) => {
          answerCheck = resolve;
        }),
    });
    pane.chats.remember('read:B', 'thread-b');
    pane.start();

    await pane.selectItem('read:B');
    await pane.selectItem(null);
    answerCheck(true);
    await pane.flush();

    expect(pane.router.navigate).toHaveBeenLastCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-b' },
    });
  });

  it('keeps the composer when Outlook reports the email the pane already shows', async () => {
    const pane = setup();
    pane.start();

    await pane.selectItem(null);
    await pane.selectItem('read:A');

    expect(pane.router.navigate).not.toHaveBeenCalled();
  });

  it('gives a chat started in a reply draft to the email being replied to', async () => {
    const pane = setup();
    pane.start();
    pane.showRoute('/chats/thread-a');

    await pane.selectItem(null);
    const created = pane.startNewChat();
    created?.('thread-reply');
    pane.showRoute('/chats/thread-reply');
    await pane.selectItem('read:B');
    await pane.selectItem('read:A');

    expect(pane.router.navigate).toHaveBeenLastCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-reply' },
    });
  });
});
