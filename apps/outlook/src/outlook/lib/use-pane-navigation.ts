import { useEffect, useState } from 'react';
import type { ChatDraftStorage } from '@ayunis/chat/composer';
import { currentOutlookItemKey, isReadItemKey } from '@/features/outlook-tools';
import type { PaneChatNavigation } from '@/outlook/lib/follow-outlook-item';

export type PaneView =
  | { kind: 'new'; draftKey: string; revision: number }
  | { kind: 'thread'; threadId: string }
  | { kind: 'history' };

export function newChatDraftKey(itemKey: string | null) {
  return `new:${itemKey ?? ''}`;
}

function newChatView(itemKey: string | null = null, revision = 0) {
  return { kind: 'new' as const, draftKey: newChatDraftKey(itemKey), revision };
}

function createNavigation(
  setView: (view: PaneView) => void,
  drafts: ChatDraftStorage,
) {
  let nextRevision = 0;
  let current: PaneView = newChatView();
  function select(view: PaneView) {
    current = view;
    setView(view);
  }
  const opening = new Set<(id: string) => void>();
  const opened = new Set<(id: string) => void>();
  const navigation: PaneChatNavigation = {
    openThread(threadId) {
      opening.forEach((listener) => listener(threadId));
      select({ kind: 'thread', threadId });
    },
    startNewChat(itemKey) {
      select(newChatView(itemKey));
    },
    onThreadOpening(listener) {
      opening.add(listener);
      return () => {
        opening.delete(listener);
      };
    },
    onThreadOpened(listener) {
      opened.add(listener);
      return () => {
        opened.delete(listener);
      };
    },
  };
  return {
    ...navigation,
    openPreparedThread(draftKey: string, threadId: string) {
      if (current.kind !== 'new' || current.draftKey !== draftKey) return;
      const itemKey = currentOutlookItemKey();
      // An ItemChanged lookup can leave the old composer visible briefly.
      if (
        itemKey &&
        itemKey !== 'read:' &&
        isReadItemKey(itemKey) &&
        draftKey !== newChatDraftKey(null) &&
        draftKey !== newChatDraftKey(itemKey)
      )
        return;
      navigation.openThread(threadId);
    },
    newChat(itemKey: string | null) {
      const view = newChatView(itemKey, ++nextRevision);
      drafts.write(view.draftKey, '');
      select(view);
    },
    showHistory: () => select({ kind: 'history' }),
    didOpen: (id: string) => opened.forEach((listener) => listener(id)),
  };
}

export function usePaneNavigation(drafts: ChatDraftStorage) {
  const [view, setView] = useState<PaneView>(() => newChatView());
  const [navigation] = useState(() => createNavigation(setView, drafts));
  useEffect(() => {
    if (view.kind === 'thread') navigation.didOpen(view.threadId);
  }, [view, navigation]);
  return { view, navigation };
}
