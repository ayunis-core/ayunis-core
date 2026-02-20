import { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LoadingSnippet {
  de: string;
  en: string;
}

// Funny German bureaucratic loading snippets with English translations
const loadingSnippets: LoadingSnippet[] = [
  { de: 'Akten durchforsten', en: 'Sifting through files' },
  { de: 'Faxe schicken', en: 'Sending faxes' },
  { de: 'Stempel suchen', en: 'Looking for the stamp' },
  { de: 'Formulare ausfüllen', en: 'Filling out forms' },
  { de: 'Ablage sortieren', en: 'Sorting the filing cabinet' },
  { de: 'Paragraphen wälzen', en: 'Studying paragraphs' },
  { de: 'Dienstweg einhalten', en: 'Following proper channels' },
  { de: 'Sachbearbeiter konsultieren', en: 'Consulting the clerk' },
  { de: 'Wartenummer ziehen', en: 'Taking a queue number' },
  { de: 'Amtsschimmel satteln', en: 'Saddling the bureaucratic horse' },
  { de: 'Bescheinigung abstempeln', en: 'Stamping the certificate' },
  { de: 'Ordner wälzen', en: 'Flipping through binders' },
  { de: 'Durchschläge anfertigen', en: 'Making carbon copies' },
  { de: 'Aktenvermerk schreiben', en: 'Writing a memo' },
  { de: 'Dienstreise beantragen', en: 'Requesting a business trip' },
  { de: 'Genehmigung einholen', en: 'Obtaining approval' },
  { de: 'Vorgang anlegen', en: 'Creating a case file' },
  { de: 'Wiedervorlage prüfen', en: 'Checking follow-ups' },
  { de: 'Posteingang sichten', en: 'Reviewing incoming mail' },
  { de: 'Unterschriftenmappe öffnen', en: 'Opening the signature folder' },
  { de: 'Büroklammern zählen', en: 'Counting paper clips' },
  { de: 'Rohrpost schicken', en: 'Sending pneumatic mail' },
  { de: 'Karteikasten durchsuchen', en: 'Searching the card index' },
  { de: 'Locher entstauben', en: 'Dusting off the hole punch' },
  { de: 'Tipp-Ex trocknen lassen', en: 'Letting the white-out dry' },
  { de: 'Archiv durchstöbern', en: 'Browsing the archive' },
  { de: 'Registratur befragen', en: 'Consulting the registry' },
  { de: 'Eingangsstempel setzen', en: 'Stamping the receipt date' },
  { de: 'Aktendeckel beschriften', en: 'Labeling the file cover' },
  { de: 'Hauspost verteilen', en: 'Distributing internal mail' },
];

function getRandomSnippetIndex(exclude?: number): number {
  const indices = Array.from({ length: loadingSnippets.length }, (_, i) => i);
  const available =
    exclude !== undefined ? indices.filter((i) => i !== exclude) : indices;
  // eslint-disable-next-line sonarjs/pseudo-random -- Random selection for UI variety, not security-sensitive
  return available[Math.floor(Math.random() * available.length)];
}

export default function StreamingLoadingIndicator() {
  const { i18n } = useTranslation();
  const [snippetIndex, setSnippetIndex] = useState(() =>
    getRandomSnippetIndex(),
  );
  const [isVisible, setIsVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const changeSnippet = () => {
      setSnippetIndex((prev) => getRandomSnippetIndex(prev));
      setIsVisible(true);
    };

    const interval = setInterval(() => {
      // Fade out, then change snippet and fade in
      setIsVisible(false);
      timeoutRef.current = setTimeout(changeSnippet, 150);
    }, 4000);
    return () => {
      clearInterval(interval);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const snippet = loadingSnippets[snippetIndex];
  const displayText = i18n.language === 'en' ? snippet.en : snippet.de;

  return (
    <div className="flex items-center gap-2 mt-4">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span
        className={`text-sm text-muted-foreground transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {displayText}...
      </span>
    </div>
  );
}
