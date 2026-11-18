import type { Mutation, QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import type { AppRouter } from '@/app/app-router';
import {
  currentOutlookItemKey,
  rememberChatItem,
} from '@/features/outlook-tools';
import { followOutlookItem } from '@/outlook/lib/follow-outlook-item';
import { createItemChats } from '@/outlook/lib/item-chats';
import { officeReady } from '@/outlook/lib/office-ready';
import {
  getThreadsControllerCreateMutationKey,
  getThreadsControllerFindOneQueryOptions,
} from '@/shared/api/generated/ayunisCoreAPI';
import type { GetThreadResponseDto } from '@/shared/api/generated/ayunisCoreAPI.schemas';

/**
 * Only an email being read has an id; a draft has none until saved. It is the
 * EWS id, which changes when the mail is moved to another folder, so a moved
 * mail starts a new chat and its earlier chat stays in the pane's history.
 * An immutable id would need a Graph call (translateExchangeIds).
 */
function readItemKey(): string | null {
  const key = currentOutlookItemKey();
  return key?.startsWith('read:') && key !== 'read:' ? key : null;
}

function watchOutlookItem(listener: () => void): () => void {
  try {
    const { mailbox } = Office.context;
    mailbox.addHandlerAsync(Office.EventType.ItemChanged, listener);
    return () => {
      try {
        mailbox.removeHandlerAsync(Office.EventType.ItemChanged);
      } catch {
        // the pane is closing
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
  onStart: () => (threadId: string) => void,
): () => void {
  const pending = new WeakMap<
    Mutation<unknown, unknown, unknown, unknown>,
    (threadId: string) => void
  >();
  return queryClient.getMutationCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    if (event.mutation.options.mutationKey?.[0] !== CREATE_THREAD) return;
    if (event.action.type === 'pending') {
      // The chat page's tools act on the email the chat was started on.
      const itemKey = currentOutlookItemKey();
      const started = onStart();
      pending.set(event.mutation, (threadId) => {
        rememberChatItem(threadId, itemKey);
        started(threadId);
      });
    } else if (event.action.type === 'success') {
      pending.get(event.mutation)?.(
        (event.action.data as GetThreadResponseDto).id,
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
      stop = followOutlookItem({
        router,
        chats: createItemChats(userId),
        currentItemKey: readItemKey,
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
