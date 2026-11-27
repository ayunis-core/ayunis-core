import { useEffect, useState } from 'react';

const WORD_MS = 30;

export function useStreamedText(
  text: string,
  enabled: boolean,
  running = true,
) {
  const words = text.split(' ');
  const [count, setCount] = useState(enabled ? 0 : words.length);

  useEffect(() => {
    if (!running || count >= words.length) return;
    const timeoutId = window.setTimeout(() => setCount((n) => n + 1), WORD_MS);
    return () => window.clearTimeout(timeoutId);
  }, [count, running, words.length]);

  const raw = words.slice(0, count).join(' ');
  const openMarker = raw.lastIndexOf('{{');
  const partial =
    openMarker > raw.lastIndexOf('}}') ? raw.slice(0, openMarker) : raw;
  const openBold = (partial.match(/\*\*/g)?.length ?? 0) % 2 === 1;

  return {
    shown: openBold ? `${partial}**` : partial,
    isDone: count >= words.length,
  };
}
