import { useEffect, useRef, type RefObject } from 'react';

export type HistoryShortcut = 'undo' | 'redo';

type ShortcutKeys = Pick<
  KeyboardEvent,
  'key' | 'metaKey' | 'ctrlKey' | 'shiftKey' | 'altKey'
>;

export function getHistoryShortcut(
  event: ShortcutKeys,
): HistoryShortcut | null {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) {
    return null;
  }
  const key = event.key.toLowerCase();
  if (key === 'z') {
    return event.shiftKey ? 'redo' : 'undo';
  }
  if (key === 'y' && event.ctrlKey && !event.shiftKey) {
    return 'redo';
  }
  return null;
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
  );
}

export function useHistoryShortcuts(
  rootRef: RefObject<HTMLElement | null>,
  handlers: Record<HistoryShortcut, () => void>,
) {
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    // RevoGrid cells never take DOM focus (cell clicks prevent the default and
    // the grid reads keys on document), so "grid is focused" is tracked from
    // the last pointer or focus target instead of document.activeElement.
    let isActive = false;
    const trackActive = (event: Event) => {
      const root = rootRef.current;
      isActive =
        root !== null && event.target instanceof Node
          ? root.contains(event.target)
          : false;
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      const shortcut = getHistoryShortcut(event);
      const root = rootRef.current;
      if (!shortcut || !isActive || root === null) {
        return;
      }
      // Leave native undo to in-cell editing and other text fields.
      if (
        isTextEntry(event.target) &&
        event.target instanceof Node &&
        root.contains(event.target)
      ) {
        return;
      }
      event.preventDefault();
      handlersRef.current[shortcut]();
    };

    document.addEventListener('pointerdown', trackActive, true);
    document.addEventListener('focusin', trackActive);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', trackActive, true);
      document.removeEventListener('focusin', trackActive);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rootRef]);
}
