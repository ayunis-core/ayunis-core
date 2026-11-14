import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PaneChatApi } from '@/outlook/api/pane-chat-api';
import { usePaneThreads } from '@/outlook/lib/use-pane-threads';

type PaneThread = Awaited<ReturnType<PaneChatApi['listThreads']>>[number];

function thread(id: string, title: string): PaneThread {
  return {
    id,
    title,
    createdAt: '2026-11-13T09:00:00.000Z',
    updatedAt: '2026-11-13T10:00:00.000Z',
    isAnonymous: false,
    mode: null,
    workspaceId: null,
    type: 'chat',
    routineId: null,
    sourceNotificationId: null,
  };
}

function fakeApi(overrides: Partial<PaneChatApi> = {}) {
  return {
    listThreads: vi.fn(() =>
      Promise.resolve([thread('t1', 'Bauantrag'), thread('t2', 'Urlaub')]),
    ),
    deleteThread: vi.fn(() => Promise.resolve()),
    renameThread: vi.fn(() => Promise.resolve()),
    createThread: vi.fn(),
    getThread: vi.fn(),
    addFileSource: vi.fn(),
    listSources: vi.fn(),
    run: vi.fn(),
    ...overrides,
  };
}

function titles(state: ReturnType<typeof usePaneThreads>['state']) {
  return state.status === 'loaded' ? state.threads.map((t) => t.title) : null;
}

describe('usePaneThreads', () => {
  it('drops a deleted chat from the list', async () => {
    const api = fakeApi();
    const onFailure = vi.fn();
    const { result } = renderHook(() => usePaneThreads(api, onFailure));
    await waitFor(() => expect(titles(result.current.state)).toHaveLength(2));

    await act(() => result.current.remove('t1'));

    expect(api.deleteThread).toHaveBeenCalledWith('t1');
    expect(titles(result.current.state)).toEqual(['Urlaub']);
  });

  it('keeps a chat whose delete failed, so it is not shown as gone', async () => {
    const onFailure = vi.fn();
    const api = fakeApi({
      deleteThread: vi.fn(() => Promise.reject(new Error('boom'))),
    });
    const { result } = renderHook(() => usePaneThreads(api, onFailure));
    await waitFor(() => expect(titles(result.current.state)).toHaveLength(2));

    await act(() => result.current.remove('t1'));

    expect(titles(result.current.state)).toEqual(['Bauantrag', 'Urlaub']);
    expect(result.current.actionFailed).toBe(true);
    expect(onFailure).toHaveBeenCalled();
  });

  it('shows the new title on the renamed chat only', async () => {
    const api = fakeApi();
    const onFailure = vi.fn();
    const { result } = renderHook(() => usePaneThreads(api, onFailure));
    await waitFor(() => expect(titles(result.current.state)).toHaveLength(2));

    await act(() => result.current.rename('t2', 'Urlaubsantrag'));

    expect(api.renameThread).toHaveBeenCalledWith('t2', 'Urlaubsantrag');
    expect(titles(result.current.state)).toEqual([
      'Bauantrag',
      'Urlaubsantrag',
    ]);
  });
});
