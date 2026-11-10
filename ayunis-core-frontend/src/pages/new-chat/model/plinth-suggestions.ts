export interface PlinthSuggestion {
  id: string;
  type: 'prompt' | 'routine' | 'continue';
  short: string;
  source: string;
  outcome: string;
  prompt?: string;
}

export const SUGGESTIONS: PlinthSuggestion[] = [
  {
    id: 'table',
    type: 'prompt',
    short: 'Änderungen zum Vorjahr als Tabelle',
    source: 'Aus Ihrem Chat „Haushaltsentwurf 2027“ vom 7. November',
    outcome:
      'Ayunis Core stellt alle Haushaltspositionen gegenüber, die sich zum Vorjahr geändert haben.',
    prompt:
      'Stelle alle Positionen des Haushaltsentwurfs 2027 in einer Tabelle dar, die sich gegenüber 2026 geändert haben. Spalten: Position, Betrag 2026, Betrag 2027, Veränderung in Prozent.',
  },
  {
    id: 'routine',
    type: 'routine',
    short: 'Verordnungen jeden Morgen prüfen lassen',
    source: 'Sie haben in zwei Wochen neunmal nach dem Gewerberecht gefragt',
    outcome:
      'Ayunis Core prüft jeden Morgen um 7 Uhr die Verkündungsplattform und meldet sich nur, wenn etwas Relevantes erscheint.',
  },
  {
    id: 'letter',
    type: 'prompt',
    short: 'Antwort an Bürgerin Müller entwerfen',
    source: 'Aus Ihrem Chat „Bürgeranfrage Parkausweis“ von gestern',
    outcome:
      'Ayunis Core entwirft ein freundliches Antwortschreiben auf Grundlage der Anfrage und der geltenden Satzung.',
    prompt:
      'Entwirf ein Antwortschreiben an Frau Müller zu ihrer Anfrage zum Bewohnerparkausweis. Halte dich an die aktuelle Parkgebührensatzung und schreibe freundlich und verständlich.',
  },
  {
    id: 'continue',
    type: 'continue',
    short: 'Weiter am Haushaltsentwurf 2027',
    source: 'Zuletzt bearbeitet gestern, 16:40 Uhr',
    outcome: 'Der Chat endete mit einer offenen Frage zu den Personalkosten.',
  },
];
