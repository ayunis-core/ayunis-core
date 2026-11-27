export interface ChatQuestion {
  id: 'role' | 'time' | 'extra';
  label: string;
  title: string;
  note: string;
  options: string[];
  multiple: boolean;
}

export type ChatStep =
  | { kind: 'say'; text: string }
  | { kind: 'question'; question: ChatQuestion }
  | { kind: 'memory'; text: string }
  | { kind: 'finish'; text: string };

export interface ChatFact {
  label: string;
  value: string;
}

export interface ChatMessage {
  id: number;
  role: 'assistant' | 'user';
  text: string;
  lead?: string;
  note?: string;
  facts?: ChatFact[];
  stepIndex?: number;
  instant?: boolean;
}

export const CHAT_SCRIPT: ChatStep[] = [
  {
    kind: 'say',
    text: 'Damit Antworten zu Ihrer Arbeit passen, ein paar kurze Fragen zu Ihnen.',
  },
  {
    kind: 'question',
    question: {
      id: 'role',
      label: 'Tätigkeit',
      title: 'Erzählen Sie kurz, was Sie in Ihrer Verwaltung machen.',
      note: 'Gern in eigenen Worten.',
      options: [
        'Ich leite ein Amt',
        'Ich bin in der Sachbearbeitung',
        'Ich arbeite im Bürgerservice',
      ],
      multiple: false,
    },
  },
  {
    kind: 'question',
    question: {
      id: 'time',
      label: 'Kostet Zeit',
      title: 'Was kostet Sie im Alltag die meiste Zeit?',
      note: 'Genau dort kann Ayunis Core am meisten abnehmen.',
      options: [
        'E-Mails und Anfragen',
        'Texte und Vorlagen',
        'Lange Dokumente lesen',
      ],
      multiple: true,
    },
  },
  {
    kind: 'question',
    question: {
      id: 'extra',
      label: 'Wichtig',
      title: 'Gibt es noch etwas, das Ayunis Core über Sie wissen sollte?',
      note: 'Zum Beispiel, wie Ihnen Antworten am meisten helfen.',
      options: ['Kurz und knapp', 'Gern mit Quellen', 'Nein, das passt'],
      multiple: false,
    },
  },
  {
    kind: 'memory',
    text: 'Danke! Jetzt kennen wir uns schon besser. Das weiß Ayunis Core ab sofort über Sie:',
  },
  {
    kind: 'finish',
    text: 'Dann schauen wir uns an, was Ayunis Core für Sie tun kann.',
  },
];
