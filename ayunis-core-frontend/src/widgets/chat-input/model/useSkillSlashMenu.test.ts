import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSkillSlashMenu } from './useSkillSlashMenu';

const skills = [
  { id: 'a', name: 'Aktenplan' },
  { id: 'b', name: 'Fristenprüfung', workspaceId: 'ws-1' },
];

function setup(value: string, caret = value.length, isEnabled = true) {
  const textarea = document.createElement('textarea');
  document.body.append(textarea);
  textarea.value = value;
  textarea.setSelectionRange(caret, caret);
  const setMessage = vi.fn();
  const onSkillSelect = vi.fn();
  const view = renderHook(() =>
    useSkillSlashMenu({
      message: value,
      setMessage,
      textareaRef: { current: textarea },
      skills,
      onSkillSelect,
      isEnabled,
    }),
  );
  act(() => view.result.current.syncFromCaret());
  return { ...view, setMessage, onSkillSelect, textarea };
}

function keyEvent(key: string) {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as React.KeyboardEvent<HTMLTextAreaElement>;
}

describe('useSkillSlashMenu', () => {
  it('opens on a slash and narrows down while typing', () => {
    const open = setup('/');
    expect(open.result.current.isOpen).toBe(true);
    expect(open.result.current.matches).toHaveLength(2);

    const typed = setup('/frist');
    expect(typed.result.current.matches.map((s) => s.id)).toEqual(['b']);
  });

  it('stays closed when the text holds no slash word', () => {
    expect(setup('Guten Tag').result.current.isOpen).toBe(false);
  });

  it('stays closed when nothing matches what was typed', () => {
    expect(setup('/zzz').result.current.isOpen).toBe(false);
  });

  it('stays closed while the feature is off', () => {
    expect(setup('/', 1, false).result.current.isOpen).toBe(false);
  });

  it('hands over the skill and cuts the typed word back out', () => {
    const view = setup('bitte /frist');
    act(() => view.result.current.handleKeyDown(keyEvent('Enter')));

    expect(view.onSkillSelect).toHaveBeenCalledWith(skills[1]);
    expect(view.setMessage).toHaveBeenCalledWith('bitte ');
    expect(view.result.current.isOpen).toBe(false);
  });

  it('walks the list with the arrow keys', () => {
    const view = setup('/');
    act(() => view.result.current.handleKeyDown(keyEvent('ArrowDown')));
    expect(view.result.current.activeIndex).toBe(1);

    act(() => view.result.current.handleKeyDown(keyEvent('ArrowUp')));
    expect(view.result.current.activeIndex).toBe(0);
  });

  it('gives up the slash word after Escape and comes back on the next letter', () => {
    const view = setup('/frist');
    act(() => view.result.current.handleKeyDown(keyEvent('Escape')));
    expect(view.result.current.isOpen).toBe(false);

    act(() => {
      view.textarea.value = '/fristen';
      view.textarea.setSelectionRange(8, 8);
      view.result.current.syncFromCaret();
    });
    expect(view.result.current.isOpen).toBe(true);
  });
});
