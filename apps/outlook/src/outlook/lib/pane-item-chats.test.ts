import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaneChatNavigation } from '@/outlook/lib/follow-outlook-item';
import { getThreadsControllerCreateMutationOptions } from '@ayunis/api-client/endpoints';
import { createItemChats } from './item-chats';
import { startPaneItemChats } from './pane-item-chats';

const request = vi.hoisted(() => vi.fn());
vi.mock('@ayunis/api-client/request', () => ({ customAxiosInstance: request }));

beforeEach(() => {
  window.localStorage.clear();
  request.mockReset();
  vi.stubGlobal('Office', {
    onReady: () => Promise.resolve(),
    EventType: { ItemChanged: 'itemChanged' },
    context: {
      mailbox: {
        item: { itemId: 'mail-a', displayReplyForm: vi.fn() },
        addHandlerAsync: vi.fn(),
        removeHandlerAsync: vi.fn(),
      },
    },
  });
});
afterEach(() => vi.unstubAllGlobals());

describe(startPaneItemChats.name, () => {
  it('restores the saved chat when a create fails after superseding its lookup', async () => {
    let resolveSavedChat!: (value: { id: string }) => void;
    const savedChat = new Promise<{ id: string }>((resolve) => {
      resolveSavedChat = resolve;
    });
    let rejectCreate!: (error: Error) => void;
    const create = new Promise<never>((_resolve, reject) => {
      rejectCreate = reject;
    });
    request.mockImplementation(({ method }: { method: string }) =>
      method === 'GET' ? savedChat : create,
    );
    const navigation = {
      openThread: vi.fn(),
      startNewChat: vi.fn(),
      onThreadOpening: () => () => undefined,
      onThreadOpened: () => () => undefined,
    } satisfies PaneChatNavigation;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const chats = createItemChats('user-a');
    chats.remember('read:mail-a', 'saved-chat');
    const stop = startPaneItemChats(navigation, queryClient, 'user-a');
    try {
      await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(1));
      const creation = queryClient
        .getMutationCache()
        .build(queryClient, getThreadsControllerCreateMutationOptions())
        .execute({ data: { modelId: 'model-a' } });
      const failed = expect(creation).rejects.toThrow('Create failed');
      await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(2));
      resolveSavedChat({ id: 'saved-chat' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(navigation.openThread).not.toHaveBeenCalled();

      rejectCreate(new Error('Create failed'));
      await failed;
      await vi.waitFor(() =>
        expect(navigation.openThread).toHaveBeenCalledExactlyOnceWith(
          'saved-chat',
        ),
      );
      expect(chats.chatFor('read:mail-a')).toBe('saved-chat');
    } finally {
      stop();
      queryClient.clear();
    }
  });
});
