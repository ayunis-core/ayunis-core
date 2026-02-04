import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// Funny German bureaucratic loading snippets
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

function getRandomSnippet(exclude?: string): string {
  const available = exclude
    ? loadingSnippets.filter((s) => s !== exclude)
    : loadingSnippets;
  return available[Math.floor(Math.random() * available.length)];
}

export default function StreamingLoadingIndicator() {
  const [snippet, setSnippet] = useState(() => getRandomSnippet());
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out, then change snippet and fade in
      setIsVisible(false);
      setTimeout(() => {
        setSnippet((prev) => getRandomSnippet(prev));
        setIsVisible(true);
      }, 150);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 mt-4">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span
        className={`text-sm text-muted-foreground transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {snippet}...
      </span>
    </div>
  );
}
