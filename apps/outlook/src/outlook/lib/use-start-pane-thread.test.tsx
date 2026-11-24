import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createChatRunLifecycle } from '@ayunis/chat/runs';
import type { ReactNode } from 'react';
import { expect, it, vi } from 'vitest';
import { useStartPaneThread } from './use-start-pane-thread';

const { create, upload, waitForFiles } = vi.hoisted(() => ({
  create: vi.fn(async () => ({ id: 'new-thread' })),
  upload: vi.fn(async () => undefined),
  waitForFiles: vi.fn(
    (_threadId: string, signal: AbortSignal) =>
      new Promise<{ id: string }>((_, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), {
          once: true,
        });
      }),
  ),
}));

vi.mock('@ayunis/api-client/endpoints', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ayunis/api-client/endpoints')>()),
  threadsControllerCreate: create,
}));

vi.mock('@/outlook/api/chat-api', () => ({
  uploadPaneFiles: upload,
  waitForPaneFiles: waitForFiles,
}));

it('does not tell the email tracker a chat is ready when a first send is stopped during file processing', async () => {
  const cache = new QueryClient();
  const lifecycle = createChatRunLifecycle({
    send: async () => new Response(null, { status: 204 }),
  });
  const openThread = vi.fn();
  const { result } = renderHook(
    () =>
      useStartPaneThread({
        lifecycle,
        draftKey: 'new:read:A',
        openThread,
        onError: vi.fn(),
      }),
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={cache}>{children}</QueryClientProvider>
      ),
    },
  );
  const accepted = vi.fn();
  let attempt: Promise<void> | undefined;
  act(() => {
    attempt = result.current.start(
      {
        text: 'Read this file',
        isAnonymous: false,
        files: [new File(['data'], 'notes.txt')],
      },
      accepted,
    );
  });
  await waitFor(() => expect(waitForFiles).toHaveBeenCalledOnce());
  expect(cache.getMutationCache().getAll()[0]?.state.status).toBe('pending');
  act(() => result.current.stop());
  await act(async () => attempt);

  expect(
    cache
      .getMutationCache()
      .getAll()
      .map(({ state }) => state.status),
  ).toEqual(['error']);
  expect(accepted).not.toHaveBeenCalled();
  expect(openThread).not.toHaveBeenCalled();
});

it('keeps a first send with its original draft while another email can send independently', async () => {
  const cache = new QueryClient();
  const send = vi.fn(async () => new Response(null, { status: 204 }));
  const lifecycle = createChatRunLifecycle({ send });
  const openThread = vi.fn();
  const onError = vi.fn();
  let finishFiles = () => {};
  waitForFiles.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finishFiles = () => resolve({ id: 'file-thread' });
      }),
  );
  const { result, rerender } = renderHook(
    (draftKey) => {
      const options = { lifecycle, openThread, onError, draftKey };
      return useStartPaneThread(options);
    },
    {
      initialProps: 'new:read:A',
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={cache}>{children}</QueryClientProvider>
      ),
    },
  );
  const accepted = vi.fn();
  let attempt: Promise<void> | undefined;
  act(() => {
    attempt = result.current.start(
      {
        text: 'Read the attachment',
        isAnonymous: false,
        files: [new File(['data'], 'notes.txt')],
      },
      accepted,
    );
  });
  await waitFor(() => expect(result.current.busy).toBe(true));
  rerender('new:read:B');
  expect(result.current.busy).toBe(false);
  await act(() =>
    result.current.start(
      { text: 'Different email', isAnonymous: false, files: [] },
      vi.fn(),
    ),
  );
  await act(async () => {
    finishFiles();
    await attempt;
  });
  expect(accepted).toHaveBeenCalledOnce();
  expect(send).toHaveBeenCalledTimes(2);
  expect(openThread.mock.calls).toEqual([
    ['new:read:B', 'new-thread'],
    ['new:read:A', 'file-thread'],
  ]);
});
