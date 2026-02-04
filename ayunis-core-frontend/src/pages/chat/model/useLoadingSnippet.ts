import { useState, useEffect, useCallback } from 'react';

// Funny German bureaucratic loading snippets
// These are shown while the AI is "thinking" and nothing has streamed yet
const loadingSnippets = [
  'Akten durchforsten',
  'Faxe schicken',
  'Stempel suchen',
  'Formulare ausfüllen',
  'Ablage sortieren',
  'Paragraphen wälzen',
  'Dienstweg einhalten',
  'Sachbearbeiter konsultieren',
  'Wartenummer ziehen',
  'Amtsschimmel satteln',
  'Bescheinigung abstempeln',
  'Ordner wälzen',
  'Durchschläge anfertigen',
  'Aktenvermerk schreiben',
  'Dienstreise beantragen',
  'Genehmigung einholen',
  'Vorgang anlegen',
  'Wiedervorlage prüfen',
  'Posteingang sichten',
  'Unterschriftenmappe öffnen',
  'Büroklammern zählen',
  'Rohrpost schicken',
  'Karteikasten durchsuchen',
  'Locher entstauben',
  'Tipp-Ex trocknen lassen',
  'Archiv durchstöbern',
  'Registratur befragen',
  'Eingangsstempel setzen',
  'Aktendeckel beschriften',
  'Hauspost verteilen',
];

function getRandomSnippet(excludeSnippet?: string): string {
  const availableSnippets = excludeSnippet
    ? loadingSnippets.filter((s) => s !== excludeSnippet)
    : loadingSnippets;
  const randomIndex = Math.floor(Math.random() * availableSnippets.length);
  return availableSnippets[randomIndex];
}

/**
 * Returns a randomly selected funny German bureaucratic loading snippet.
 * The snippet changes every 2 seconds to create an animated loading effect.
 *
 * @param isActive - Whether the loading animation should be active
 * @returns A funny German loading text snippet
 */
export function useLoadingSnippet(isActive: boolean = true): string {
  const [snippet, setSnippet] = useState(() => getRandomSnippet());

  const updateSnippet = useCallback(() => {
    setSnippet((prev) => getRandomSnippet(prev));
  }, []);

  useEffect(() => {
    if (!isActive) return;

    // Update snippet every 2 seconds while active
    const interval = setInterval(updateSnippet, 2000);

    return () => clearInterval(interval);
  }, [isActive, updateSnippet]);

  // Reset to a new snippet when becoming active
  useEffect(() => {
    if (isActive) {
      setSnippet(getRandomSnippet());
    }
  }, [isActive]);

  return snippet;
}
