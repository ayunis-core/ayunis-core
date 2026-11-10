export type NewsCategory = 'product' | 'tips' | 'events';

export type NewsCoverTone = 'violet' | 'blue' | 'amber' | 'green';
export type NewsCoverIcon = 'routine' | 'keyboard' | 'calendar' | 'credits';

export interface NewsEntry {
  id: string;
  category: NewsCategory;
  title: string;
  summary: string;
  body: string;
  date: string;
  isForAdmins?: boolean;
  cover: { tone: NewsCoverTone; icon: NewsCoverIcon };
  questions: string[];
}

export const NEWS_CATEGORIES: { id: NewsCategory; label: string }[] = [
  { id: 'product', label: 'Produkt-Updates' },
  { id: 'tips', label: 'Tipps' },
  { id: 'events', label: 'Termine' },
];

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY).toISOString();
}

export function buildSampleNews(): NewsEntry[] {
  return [
    {
      id: 'sample-news-1',
      category: 'product',
      title: 'Routinen erledigen jetzt wiederkehrende Aufgaben für Sie',
      summary:
        'Ayunis Core prüft jeden Tag zur gewünschten Uhrzeit Ihre Quellen und legt die Ergebnisse im Posteingang ab.',
      body: `Mit **Routinen** prüft Ayunis Core jeden Tag zur gewünschten Uhrzeit Ihre Quellen, zum Beispiel die Verkündungsplattform Ihres Landes oder den Pressespiegel.

Findet Ayunis Core etwas Relevantes, landet das Ergebnis in Ihrem Posteingang. Gibt es nichts Neues, bleibt es ruhig.

**So probieren Sie es aus:** Öffnen Sie in der Seitenleiste „Routinen“ und wählen Sie eine der fertigen Vorlagen.`,
      date: daysAgo(1),
      cover: { tone: 'violet', icon: 'routine' },
      questions: [
        'Wie richte ich meine erste Routine ein?',
        'Welche Quellen kann eine Routine prüfen?',
        'Was kostet eine Routine an Credits?',
      ],
    },
    {
      id: 'sample-news-2',
      category: 'tips',
      title: 'Frühere Eingaben mit den Pfeiltasten wieder aufrufen',
      summary:
        'Mit der Pfeiltaste nach oben holen Sie Ihre letzten Eingaben zurück ins Eingabefeld.',
      body: `Drücken Sie im leeren Eingabefeld die **Pfeiltaste nach oben**, um Ihre letzte Eingabe wieder aufzurufen. Mehrfaches Drücken blättert weiter zurück.`,
      date: daysAgo(4),
      cover: { tone: 'blue', icon: 'keyboard' },
      questions: [
        'Funktioniert das in allen Chats?',
        'Was passiert mit meinem angefangenen Text?',
        'Gibt es weitere Tastenkürzel?',
      ],
    },
    {
      id: 'sample-news-3',
      category: 'events',
      title: 'Online-Sprechstunde am 19. November, 10 Uhr',
      summary:
        'Stellen Sie Ihre Fragen zu Routinen und Arbeitsbereichen direkt an das Ayunis-Team.',
      body: `In der Sprechstunde zeigen wir in 30 Minuten, wie Sie Routinen für Ihre Abteilung einrichten, und beantworten Ihre Fragen.

**Wann:** 19. November, 10:00 bis 10:30 Uhr
**Wo:** Online, der Link kommt mit der Anmeldung.`,
      date: daysAgo(6),
      cover: { tone: 'amber', icon: 'calendar' },
      questions: [
        'Wie melde ich mich an?',
        'Wird die Sprechstunde aufgezeichnet?',
        'Kann ich Fragen vorab einreichen?',
      ],
    },
    {
      id: 'sample-news-4',
      category: 'product',
      title: 'Standard-Credit-Limit für alle Personen festlegen',
      summary:
        'Admins können jetzt ein Standardlimit festlegen, das für alle Personen der Organisation gilt.',
      body: `In den Admin-Einstellungen unter **Credit-Limits** legen Sie ein Standardlimit fest. Es gilt für alle Personen, für die kein eigenes Limit gesetzt ist.`,
      date: daysAgo(12),
      isForAdmins: true,
      cover: { tone: 'green', icon: 'credits' },
      questions: [
        'Wo stelle ich das Standardlimit ein?',
        'Was passiert, wenn das Limit erreicht ist?',
        'Wie verhält sich das zu Team-Limits?',
      ],
    },
  ];
}
