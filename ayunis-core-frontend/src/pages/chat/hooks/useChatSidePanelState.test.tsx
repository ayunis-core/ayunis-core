import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatSidePanelState } from './useChatSidePanelState';

const mocks = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate,
}));

describe('useChatSidePanelState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens on artifacts and switches tabs without URL tab state', () => {
    const { result } = renderHook(() => useChatSidePanelState('thread-id'));

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.view).toBe('artifact-list');

    act(() => result.current.openTab('context'));
    expect(result.current.view).toBe('context');
    expect(mocks.navigate).toHaveBeenLastCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-id' },
      search: { artifactId: undefined },
      replace: true,
    });
  });

  it('forces artifact deep links onto artifacts and clears them on close', () => {
    const { result, rerender } = renderHook(
      ({ artifactId }: { artifactId?: string }) =>
        useChatSidePanelState('thread-id', artifactId),
      { initialProps: { artifactId: undefined as string | undefined } },
    );

    act(() => result.current.openTab('context'));
    rerender({ artifactId: 'artifact-id' });
    expect(result.current.view).toBe('artifact-detail');

    act(() => result.current.close());
    expect(mocks.navigate).toHaveBeenLastCalledWith({
      to: '/chats/$threadId',
      params: { threadId: 'thread-id' },
      search: { artifactId: undefined },
      replace: true,
    });
  });

  it('does not leak local tab state between threads', () => {
    const { result, rerender } = renderHook(
      ({ threadId }: { threadId: string }) => useChatSidePanelState(threadId),
      { initialProps: { threadId: 'thread-a' } },
    );

    act(() => result.current.openTab('context'));
    rerender({ threadId: 'thread-b' });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.view).toBe('artifact-list');
  });
});
