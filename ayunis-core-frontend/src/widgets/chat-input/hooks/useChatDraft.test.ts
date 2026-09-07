import { act, renderHook } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { useChatDraft } from './useChatDraft';

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe('useChatDraft', () => {
  beforeAll(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createMemoryStorage(),
    });
  });

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('restores an unsent draft when the same chat is mounted again', () => {
    const firstMount = renderHook(() => useChatDraft('thread-1'));

    act(() => firstMount.result.current.setMessage('unfinished prompt'));
    firstMount.unmount();

    const secondMount = renderHook(() => useChatDraft('thread-1'));

    expect(secondMount.result.current.message).toBe('unfinished prompt');
  });

  it('keeps drafts isolated when the mounted input changes chats', () => {
    const { result, rerender } = renderHook(
      ({ chatId }) => useChatDraft(chatId),
      { initialProps: { chatId: 'thread-1' } },
    );

    act(() => result.current.setMessage('first chat prompt'));
    rerender({ chatId: 'thread-2' });

    expect(result.current.message).toBe('');

    act(() => result.current.setMessage('second chat prompt'));
    rerender({ chatId: 'thread-1' });

    expect(result.current.message).toBe('first chat prompt');
  });

  it('removes the stored draft when the input is cleared', () => {
    const firstMount = renderHook(() => useChatDraft('thread-1'));

    act(() => firstMount.result.current.setMessage('sent prompt'));
    act(() => firstMount.result.current.setMessage(''));
    firstMount.unmount();

    const secondMount = renderHook(() => useChatDraft('thread-1'));

    expect(secondMount.result.current.message).toBe('');
    expect(window.localStorage.length).toBe(0);
  });
});
