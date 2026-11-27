import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useNewChatSelection } from './useNewChatSelection';

const personalSkill = { id: 'reply', name: 'Bürgeranfrage' };
const workspaceSkill = { id: 'permit', name: 'Bauantrag', workspaceId: 'a' };

describe('useNewChatSelection', () => {
  it('drops a skill pinned in the previous workspace when the workspace changes', () => {
    const { result } = renderHook(() => useNewChatSelection('a'));
    act(() => result.current.toggleSkill(workspaceSkill));

    act(() => result.current.selectWorkspace('b'));

    expect(result.current.workspaceId).toBe('b');
    expect(result.current.skill).toBeUndefined();
  });

  it('keeps a personal skill when the workspace changes', () => {
    const { result } = renderHook(() => useNewChatSelection('a'));
    act(() => result.current.toggleSkill(personalSkill));

    act(() => result.current.selectWorkspace(null));

    expect(result.current.skill).toEqual(personalSkill);
  });

  it('clears a pinned skill that is picked again', () => {
    const { result } = renderHook(() => useNewChatSelection(undefined));
    act(() => result.current.toggleSkill(personalSkill));

    act(() => result.current.toggleSkill(personalSkill));

    expect(result.current.skill).toBeUndefined();
  });
});
