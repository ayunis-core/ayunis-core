import { describe, expect, it } from 'vitest';
import {
  MAX_HISTORY_ENTRIES,
  canRedo,
  canUndo,
  commitHistory,
  createHistory,
  redoHistory,
  undoHistory,
} from './edit-history';

describe('edit history', () => {
  it('undoes and redoes committed states in order', () => {
    let history = createHistory('a');
    history = commitHistory(history, 'b');
    history = commitHistory(history, 'c');

    history = undoHistory(history);
    expect(history.present).toBe('b');
    history = undoHistory(history);
    expect(history.present).toBe('a');
    expect(canUndo(history)).toBe(false);

    history = redoHistory(history);
    history = redoHistory(history);
    expect(history.present).toBe('c');
    expect(canRedo(history)).toBe(false);
  });

  it('returns the same history when there is nothing to undo or redo', () => {
    const history = createHistory('a');

    expect(undoHistory(history)).toBe(history);
    expect(redoHistory(history)).toBe(history);
  });

  it('clears the redo stack when a new state is committed', () => {
    let history = commitHistory(createHistory('a'), 'b');
    history = undoHistory(history);
    history = commitHistory(history, 'c');

    expect(canRedo(history)).toBe(false);
    expect(undoHistory(history).present).toBe('a');
  });

  it('ignores commits that do not change the present state', () => {
    const history = commitHistory(createHistory('a'), 'b');

    expect(commitHistory(history, 'b')).toBe(history);
  });

  it('drops the oldest entries beyond the cap', () => {
    let history = createHistory(0);
    for (let i = 1; i <= MAX_HISTORY_ENTRIES + 5; i++) {
      history = commitHistory(history, i);
    }

    expect(history.past).toHaveLength(MAX_HISTORY_ENTRIES);
    expect(history.past[0]).toBe(5);
  });
});
