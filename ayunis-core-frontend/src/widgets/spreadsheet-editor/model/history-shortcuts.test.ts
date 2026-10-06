import { describe, expect, it } from 'vitest';
import { getHistoryShortcut } from './history-shortcuts';

const keys = (key: string, modifiers: Partial<KeyboardEvent> = {}) => ({
  key,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...modifiers,
});

describe('getHistoryShortcut', () => {
  it.each([
    [keys('z', { metaKey: true }), 'undo'],
    [keys('z', { ctrlKey: true }), 'undo'],
    [keys('Z', { metaKey: true, shiftKey: true }), 'redo'],
    [keys('Z', { ctrlKey: true, shiftKey: true }), 'redo'],
    [keys('y', { ctrlKey: true }), 'redo'],
    [keys('z'), null],
    [keys('y', { metaKey: true }), null],
    [keys('z', { ctrlKey: true, altKey: true }), null],
    [keys('a', { ctrlKey: true }), null],
  ])('maps %o to %s', (event, expected) => {
    expect(getHistoryShortcut(event)).toBe(expected);
  });
});
