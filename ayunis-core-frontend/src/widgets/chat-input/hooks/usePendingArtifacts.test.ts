import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ArtifactScope } from '@/shared/contexts/chat/chatContext';
import { usePendingArtifacts } from './usePendingArtifacts';

const letter = { id: 'letter', title: 'Brief', type: 'document' } as const;
const personal: ArtifactScope = { workspaceId: null, isAnonymous: false };

function renderPending(scope: ArtifactScope) {
  return renderHook((props) => usePendingArtifacts(props), {
    initialProps: scope,
  });
}

describe('usePendingArtifacts', () => {
  it('keeps an artifact picked twice only once', () => {
    const { result } = renderPending(personal);

    act(() => result.current.add(letter));
    act(() => result.current.add(letter));

    expect(result.current.artifacts).toEqual([letter]);
  });

  it.each([
    ['moves to a workspace', { workspaceId: 'workspace', isAnonymous: false }],
    ['turns anonymous', { workspaceId: null, isAnonymous: true }],
  ])(
    'drops the picked artifacts when the chat about to start %s, so it is not started with artifacts of another scope',
    (_, nextScope) => {
      const { result, rerender } = renderPending(personal);
      act(() => result.current.add(letter));

      rerender(nextScope);

      expect(result.current.artifacts).toEqual([]);
    },
  );

  it('drops the picked artifacts when another chat of the same scope opens in the composer, so they are not linked to that chat', () => {
    const { result, rerender } = renderHook(
      ({ chatId }) => usePendingArtifacts(personal, chatId),
      { initialProps: { chatId: 'first-chat' } },
    );
    act(() => result.current.add(letter));

    rerender({ chatId: 'second-chat' });

    expect(result.current.artifacts).toEqual([]);
  });

  it('keeps the picked artifacts while the scope stays the same', () => {
    const { result, rerender } = renderPending(personal);
    act(() => result.current.add(letter));

    rerender({ ...personal });

    expect(result.current.artifacts).toEqual([letter]);
  });
});
