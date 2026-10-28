import type { PropsWithChildren } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateFileSource } from './useCreateFileSource';
import { useMessageSend } from './useMessageSend';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), handleError: vi.fn() }));
vi.mock('@/shared/api', () => ({
  getThreadsControllerFindOneQueryKey: (id: string) => ['thread', id],
  threadSourcesControllerAddFileSource: mocks.upload,
}));
vi.mock('@/shared/api/generated/ayunisCoreAPI', () => ({
  getThreadsControllerFindOneQueryKey: (id: string) => ['thread', id],
  getThreadsControllerFindAllQueryKey: () => ['threads'],
  getArtifactsControllerFindByThreadQueryKey: (id: string) => ['artifacts', id],
  getThreadAiContextControllerGetAiContextQueryKey: (id: string) => [
    'ai-context',
    id,
  ],
}));
vi.mock('@/shared/lib/handle-source-upload-error', () => ({
  default: mocks.handleError,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function setup() {
  const refresh = deferred<string[]>();
  const queryFn = vi.fn(() => refresh.promise);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(
    () => {
      const thread = useQuery({
        queryKey: ['thread', 'ongoing-chat'],
        queryFn,
        initialData: [] as string[],
        staleTime: Infinity,
      });
      return {
        ...useCreateFileSource({ threadId: 'ongoing-chat' }),
        sources: thread.data,
        send: useMessageSend({ threadId: 'ongoing-chat' }),
      };
    },
    { wrapper },
  );
  return { ...hook, refresh, queryFn, client };
}

const file = new File(['salary table'], 'besoldungstabelle.pdf', {
  type: 'application/pdf',
});

describe('useCreateFileSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('keeps sending blocked until the uploaded source is visible in the thread cache', async () => {
    const { result, refresh, queryFn } = setup();
    act(() => result.current.createFileSource({ file }));
    await waitFor(() => expect(queryFn).toHaveBeenCalledOnce());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.sources).toEqual([]);
    await act(async () => refresh.resolve(['processing-pdf']));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sources).toEqual(['processing-pdf']);
  });

  it('keeps concurrent uploads pending until their thread refresh completes', async () => {
    const secondUpload = deferred<void>();
    mocks.upload
      .mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(secondUpload.promise);
    const { result, refresh, queryFn } = setup();
    act(() => {
      result.current.createFileSource({ file });
      result.current.createFileSource({
        file: new File(['minutes'], 'minutes.pdf'),
      });
    });
    await waitFor(() => expect(queryFn).toHaveBeenCalledOnce());
    await act(async () => secondUpload.resolve());
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(result.current.isLoading).toBe(true);
    await act(async () => refresh.resolve(['salary-pdf', 'minutes-pdf']));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sources).toHaveLength(2);
  });

  it('keeps sending blocked when run completion replaces the upload refresh', async () => {
    const { result, refresh, queryFn } = setup();
    const replacement = deferred<string[]>();
    queryFn
      .mockReturnValueOnce(refresh.promise)
      .mockReturnValueOnce(replacement.promise);
    act(() => result.current.createFileSource({ file }));
    await waitFor(() => expect(queryFn).toHaveBeenCalledOnce());
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('')));
    let sendPromise: Promise<void> | undefined;
    act(() => {
      sendPromise = result.current.send.sendTextMessage({
        text: 'Finish the previous response.',
      });
    });
    await waitFor(() => expect(queryFn).toHaveBeenCalledTimes(2));
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(queryFn).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.sources).toEqual([]);
    await act(async () => {
      replacement.resolve(['processing-pdf']);
      await sendPromise;
    });
    await act(async () => refresh.resolve(['stale-thread-snapshot']));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sources).toEqual(['processing-pdf']);
  });

  it('does not block sending for a thread refresh unrelated to an upload', async () => {
    const { result, client, refresh, queryFn } = setup();
    act(() => {
      void client.refetchQueries({ queryKey: ['thread', 'ongoing-chat'] });
    });
    await waitFor(() => expect(queryFn).toHaveBeenCalledOnce());
    expect(result.current.isLoading).toBe(false);
    await act(async () => refresh.resolve([]));
  });

  it('preserves upload error feedback and releases loading after reconciliation', async () => {
    const error = new Error('Upload unavailable');
    mocks.upload.mockRejectedValue(error);
    const { result, refresh, queryFn } = setup();
    act(() => result.current.createFileSource({ file }));
    await waitFor(() => expect(queryFn).toHaveBeenCalledOnce());
    expect(mocks.handleError).toHaveBeenCalledWith(error, expect.any(Function));
    await act(async () => refresh.resolve([]));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(error);
  });
});
