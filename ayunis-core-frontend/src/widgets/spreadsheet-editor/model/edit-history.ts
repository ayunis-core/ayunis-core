export const MAX_HISTORY_ENTRIES = 50;

export interface EditHistory<T> {
  past: T[];
  present: T;
  future: T[];
}

export function createHistory<T>(present: T): EditHistory<T> {
  return { past: [], present, future: [] };
}

export function canUndo<T>(history: EditHistory<T>): boolean {
  return history.past.length > 0;
}

export function canRedo<T>(history: EditHistory<T>): boolean {
  return history.future.length > 0;
}

export function commitHistory<T>(
  history: EditHistory<T>,
  next: T,
): EditHistory<T> {
  if (next === history.present) {
    return history;
  }
  return {
    past: [...history.past, history.present].slice(-MAX_HISTORY_ENTRIES),
    present: next,
    future: [],
  };
}

export function undoHistory<T>(history: EditHistory<T>): EditHistory<T> {
  if (!canUndo(history)) {
    return history;
  }
  return {
    past: history.past.slice(0, -1),
    present: history.past[history.past.length - 1],
    future: [history.present, ...history.future],
  };
}

export function redoHistory<T>(history: EditHistory<T>): EditHistory<T> {
  if (!canRedo(history)) {
    return history;
  }
  return {
    past: [...history.past, history.present],
    present: history.future[0],
    future: history.future.slice(1),
  };
}
