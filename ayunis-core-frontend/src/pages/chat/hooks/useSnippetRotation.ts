import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Snippet {
  de: string;
  en: string;
}

function getRandomSnippetIndex(total: number, exclude?: number): number {
  const indices = Array.from({ length: total }, (_, i) => i);
  const available =
    exclude !== undefined ? indices.filter((i) => i !== exclude) : indices;
  // eslint-disable-next-line sonarjs/pseudo-random -- UI variety, not security-sensitive
  return available[Math.floor(Math.random() * available.length)];
}

interface UseSnippetRotationOptions {
  readonly snippets: readonly Snippet[];
  readonly intervalMs: number;
  readonly fadeMs: number;
}

export function useSnippetRotation({
  snippets,
  intervalMs,
  fadeMs,
}: UseSnippetRotationOptions) {
  const { i18n } = useTranslation();
  const [snippetIndex, setSnippetIndex] = useState(() =>
    getRandomSnippetIndex(snippets.length),
  );
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const changeSnippet = () => {
      setSnippetIndex((prev) => getRandomSnippetIndex(snippets.length, prev));
      setIsVisible(true);
    };

    const interval = setInterval(() => {
      setIsVisible(false);
      timeoutRef.current = setTimeout(changeSnippet, fadeMs);
    }, intervalMs);
    return () => {
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [snippets.length, intervalMs, fadeMs]);

  const snippet = snippets[snippetIndex];
  const displayText = i18n.language === 'en' ? snippet.en : snippet.de;

  return { displayText, isVisible };
}
