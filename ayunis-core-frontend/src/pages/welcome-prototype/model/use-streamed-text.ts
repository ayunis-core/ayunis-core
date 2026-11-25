import { useEffect, useState } from 'react';

const WORD_MS = 30;

export function useStreamedText(text: string, enabled: boolean) {
  const words = text.split(' ');
  const [count, setCount] = useState(enabled ? 0 : words.length);

  useEffect(() => {
    if (count >= words.length) return;
    const timeoutId = window.setTimeout(() => setCount((n) => n + 1), WORD_MS);
    return () => window.clearTimeout(timeoutId);
  }, [count, words.length]);

  return {
    shown: words.slice(0, count).join(' '),
    isDone: count >= words.length,
  };
}
