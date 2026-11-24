import type { Mutation, QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { AppRouter } from '@/app/app-router';
import {
  currentOutlookItemKey,
  currentOutlookLegacyReadKey,
  currentOutlookReplySourceKey,
  isReadItemKey,
  rememberChatItem,
  notifyOutlookItemChanged,
} from '@/features/outlook-tools';
import { followOutlookItem } from '@/outlook/lib/follow-outlook-item';
import { createItemChats } from '@/outlook/lib/item-chats';
import { officeReady } from '@/outlook/lib/office-ready';
import {
  getThreadsControllerCreateMutationKey,
  getThreadsControllerFindOneQueryOptions,
} from '@ayunis/api-client/endpoints';
import type { GetThreadResponseDto } from '@ayunis/api-client/schemas';

function watchOutlookItem(listener: () => void): () => void {
  try {
    const { mailbox } = Office.context;
    const event = Office.EventType.ItemChanged;
    mailbox.addHandlerAsync(event, () => {
      listener();
      notifyOutlookItemChanged();
    });
    return () => {
      try {
        mailbox.removeHandlerAsync(event);
      } catch {
        // The pane may be closing.
      }
    };
  } catch {
    return () => undefined;
  }
}

const CREATE_THREAD = getThreadsControllerCreateMutationKey()[0];

// The chat app creates a chat with the generated create-thread mutation.
function watchNewChats(
  queryClient: QueryClient,
  onStart: () => (threadId?: string) => void,
): () => void {
  const pending = new WeakMap<
    Mutation<unknown, unknown, unknown, unknown>,
    (threadId?: string) => void
  >();
  return queryClient.getMutationCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    if (event.mutation.options.mutationKey?.[0] !== CREATE_THREAD) return;
    if (event.action.type === 'pending') {
      if (pending.has(event.mutation)) return;
      // The chat page's tools act on the email the chat was started on.
      const itemKey = currentOutlookItemKey();
      const started = onStart();
      pending.set(event.mutation, (threadId) => {
        if (threadId !== undefined) rememberChatItem(threadId, itemKey);
        started(threadId);
      });
    } else if (
      event.action.type === 'success' ||
      event.action.type === 'error'
    ) {
      const settled = pending.get(event.mutation);
      pending.delete(event.mutation);
      settled?.(
        event.action.type === 'success'
          ? (event.action.data as GetThreadResponseDto).id
          : undefined,
      );
    }
  });
}

// Asks the server, not the cache: a chat deleted since it was loaded must not
// reopen. Only a deleted chat is forgotten; a failed request keeps it.
function chatExists(queryClient: QueryClient, threadId: string) {
  return queryClient
    .query({
      ...getThreadsControllerFindOneQueryOptions(threadId),
      staleTime: 0,
    })
    .then(
      () => true,
      (error: unknown) =>
        !(error instanceof AxiosError && error.response?.status === 404),
    );
}

/** Gives each email its own chat once Office is ready; returns the stop. */
export function startPaneItemChats(
  router: AppRouter,
  queryClient: QueryClient,
  userId: string,
): () => void {
  let stop: (() => void) | undefined;
  let stopped = false;
  void officeReady().then(
    () => {
      if (stopped) return;
      const chats = createItemChats(userId);
      stop = followOutlookItem({
        router,
        chats,
        currentItemKey: () => {
          const key = currentOutlookItemKey();
          if (isReadItemKey(key)) return key === 'read:' ? null : key;
          const source = currentOutlookReplySourceKey();
          return source && chats.chatFor(source) ? source : null;
        },
        legacyItemKey: currentOutlookLegacyReadKey,
        canRememberChat: (itemKey) =>
          currentOutlookReplySourceKey() !== itemKey,
        watchItem: watchOutlookItem,
        watchNewChats: (onStart) => watchNewChats(queryClient, onStart),
        chatExists: (threadId) => chatExists(queryClient, threadId),
        rememberChatItem,
      });
    },
    () => undefined,
  );
  return () => {
    stopped = true;
    stop?.();
  };
}
