import { act, renderHook } from '@testing-library/react';
import { createMemoryChatDraftStorage } from '@ayunis/chat/composer';
import { expect, it } from 'vitest';
import { usePaneNavigation } from './use-pane-navigation';

it('keeps each email draft separate and clears just the current email on New chat', () => {
  const drafts = createMemoryChatDraftStorage();
  const { result } = renderHook(() => usePaneNavigation(drafts));

  function writeItemDraft(itemKey: string, text: string) {
    act(() => result.current.navigation.startNewChat(itemKey));
    const { view } = result.current;
    if (view.kind !== 'new') throw new Error('Expected a new chat');
    expect(drafts.read(view.draftKey)).toBe('');
    drafts.write(view.draftKey, text);
    return view.draftKey;
  }

  const first = writeItemDraft('read:A', 'First email draft');
  const second = writeItemDraft('read:B', 'Second email draft');

  act(() => result.current.navigation.newChat('read:B'));

  expect(result.current.view).toMatchObject({ kind: 'new', draftKey: second });
  expect(drafts.read(second)).toBe('');
  expect(drafts.read(first)).toBe('First email draft');
});

it('opens a prepared chat only while its composer is selected', () => {
  const drafts = createMemoryChatDraftStorage();
  const { result } = renderHook(() => usePaneNavigation(drafts));

  act(() => {
    result.current.navigation.startNewChat('read:B');
    result.current.navigation.openPreparedThread('new:read:A', 'thread-a');
  });
  expect(result.current.view).toMatchObject({
    kind: 'new',
    draftKey: 'new:read:B',
  });

  act(() => {
    result.current.navigation.startNewChat('read:A');
    result.current.navigation.openPreparedThread('new:read:A', 'thread-a');
  });
  expect(result.current.view).toEqual({ kind: 'thread', threadId: 'thread-a' });
});

it('returns to history after deleting only when the deleted chat is still selected', () => {
  const drafts = createMemoryChatDraftStorage();
  const { result } = renderHook(() => usePaneNavigation(drafts));

  act(() => {
    result.current.navigation.openThread('first');
    result.current.navigation.openThread('second');
    result.current.navigation.showHistoryAfterDelete('first');
  });
  expect(result.current.view).toEqual({ kind: 'thread', threadId: 'second' });

  act(() => result.current.navigation.showHistoryAfterDelete('second'));
  expect(result.current.view).toEqual({ kind: 'history' });
});
