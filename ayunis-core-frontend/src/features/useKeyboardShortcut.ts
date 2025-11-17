import { useEffect } from 'react';

type Key = string;

export default function useKeyboardShortcut(
  targetKeys: Key[],
  callback: () => void,
  options?: { exclusive?: boolean },
): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Create a set of the keys that are currently pressed
      const pressedKeys = new Set<Key>();

      if (event.ctrlKey || event.metaKey) {
        pressedKeys.add('Control');
        pressedKeys.add('Meta');
      }
      if (event.shiftKey) pressedKeys.add('Shift');
      if (event.altKey) pressedKeys.add('Alt');
      pressedKeys.add(event.key);

      // Convert targetKeys to a set and compare
      const targetKeySet = new Set(targetKeys);

      const isMatch = options?.exclusive
        ? [...targetKeySet].every((key) => pressedKeys.has(key)) &&
          pressedKeys.size === targetKeySet.size
        : [...targetKeySet].every((key) => pressedKeys.has(key));

      if (isMatch) {
        event.preventDefault(); // Prevent default behavior if needed
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetKeys, callback, options]);
}
