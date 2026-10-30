import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useModelModeEntries } from './useModelModeEntries';

const server = vi.hoisted(() => ({
  entries: [] as { modelId: string; enabled: boolean }[],
  pending: [] as (() => void)[],
  rejects: [] as (() => void)[],
  load: null as Promise<never> | null,
}));
vi.mock('@/shared/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  superAdminModelModesControllerGetEntries: () =>
    server.load ?? Promise.resolve(server.entries),
  // Each save completes only when the test releases it.
  superAdminModelModesControllerReplaceEntries: (
    _mode: string,
    { entries }: { entries: typeof server.entries },
  ) =>
    new Promise<void>((resolve, reject) => {
      server.rejects.push(() => reject(new Error('save failed')));
      server.pending.push(() => {
        server.entries = entries;
        resolve();
      });
    }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/lib/toast', () => ({ showError: vi.fn() }));

beforeEach(() => {
  server.entries = [{ modelId: 'a', enabled: true }];
  server.pending = [];
  server.rejects = [];
  server.load = null;
});

describe('useModelModeEntries', () => {
  it('keeps both of two rapid edits when the first save finishes last', async () => {
    const client = new QueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useModelModeEntries('auto'), {
      wrapper,
    });
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    act(() =>
      result.current.replaceEntries([
        ...result.current.entries,
        { modelId: 'b', enabled: true },
      ]),
    );
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    act(() =>
      result.current.replaceEntries([
        ...result.current.entries,
        { modelId: 'c', enabled: true },
      ]),
    );
    await waitFor(() => expect(result.current.entries).toHaveLength(3));

    // Release saves in reverse order: a parallel client would end with [a, b].
    await waitFor(() => expect(server.pending.length).toBeGreaterThan(0));
    while (server.pending.length > 0) {
      await act(async () => server.pending.pop()?.());
      await new Promise((r) => setTimeout(r, 20));
    }

    await waitFor(() =>
      expect(server.entries.map((e) => e.modelId)).toEqual(['a', 'b', 'c']),
    );
    await waitFor(() =>
      expect(result.current.entries.map((e) => e.modelId)).toEqual([
        'a',
        'b',
        'c',
      ]),
    );
  });

  it('preserves newer edits when an earlier queued save fails', async () => {
    const { result } = renderEntries();
    await waitFor(() => expect(result.current.entries).toHaveLength(1));

    act(() =>
      result.current.replaceEntries([
        ...result.current.entries,
        { modelId: 'b', enabled: true },
      ]),
    );
    await waitFor(() => expect(server.pending).toHaveLength(1));
    act(() =>
      result.current.replaceEntries([
        ...result.current.entries,
        { modelId: 'c', enabled: true },
      ]),
    );
    await waitFor(() => expect(result.current.entries).toHaveLength(3));

    await act(async () => server.rejects[0]());
    await waitFor(() => expect(server.pending).toHaveLength(2));
    act(() =>
      result.current.replaceEntries(
        result.current.entries.map((entry) =>
          entry.modelId === 'a' ? { ...entry, enabled: false } : entry,
        ),
      ),
    );
    await act(async () => server.pending[1]());
    await waitFor(() => expect(server.pending).toHaveLength(3));
    await act(async () => server.pending[2]());

    const expected = [
      { modelId: 'a', enabled: false },
      { modelId: 'b', enabled: true },
      { modelId: 'c', enabled: true },
    ];
    await waitFor(() => expect(server.entries).toEqual(expected));
    await waitFor(() => expect(result.current.entries).toEqual(expected));
  });

  it('does not save before the stored list has loaded', async () => {
    server.load = new Promise<never>(() => undefined);
    const { result } = renderEntries();

    act(() => result.current.replaceEntries([{ modelId: 'b', enabled: true }]));

    await new Promise((r) => setTimeout(r, 20));
    expect(server.pending).toHaveLength(0);
    expect(result.current.isLoaded).toBe(false);
  });

  it('restores the prior list when the only pending save fails', async () => {
    const { result } = renderEntries();
    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    const previous = result.current.entries;

    act(() =>
      result.current.replaceEntries([
        ...previous,
        { modelId: 'b', enabled: true },
      ]),
    );
    await waitFor(() => expect(result.current.entries).toHaveLength(2));
    await act(async () => server.rejects[0]());

    await waitFor(() => expect(result.current.entries).toEqual(previous));
    expect(server.entries).toEqual(previous);
  });
});

function renderEntries() {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useModelModeEntries('auto'), { wrapper });
}
