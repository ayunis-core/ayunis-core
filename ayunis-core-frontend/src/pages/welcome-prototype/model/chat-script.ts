export interface ChatQuestion {
  id: 'role' | 'tasks' | 'style' | 'tools';
  label: string;
  title: string;
  note: string;
  options: string[];
  multiple: boolean;
}

export type ChatStep =
  | { kind: 'say'; text: string }
  | { kind: 'question'; question: ChatQuestion }
  | { kind: 'memory'; text: string };

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
  isHero?: boolean;
}

export const CHAT_SCRIPT: ChatStep[] = [
  {
    kind: 'say',
    text: 'Damit Antworten zu Ihrer Arbeit passen, vier kurze Fragen zu Ihnen.',
  },
  {
    kind: 'question',
    question: {
      id: 'role',
      label: 'Funktion',
      title: 'Was ist Ihre Funktion im Bauamt?',
      note: 'Daran richtet Ayunis Core aus, wie fachlich Antworten sind.',
      options: ['Sachbearbeitung', 'Teamleitung', 'Fachbereichsleitung'],
      multiple: false,
    },
  },
  {
    kind: 'question',
    question: {
      id: 'tasks',
      label: 'Aufgaben',
      title: 'Welche Aufgaben nehmen bei Ihnen die meiste Zeit ein?',
      note: 'Gern in eigenen Worten.',
      options: [
        'Bauanträge prüfen',
        'Bürgeranfragen beantworten',
        'Stellungnahmen auswerten',
      ],
      multiple: true,
    },
  },
  {
    kind: 'question',
    question: {
      id: 'style',
      label: 'Antworten',
      title: 'Wie sollen Antworten aussehen?',
      note: 'In jedem Chat können Sie es anders festlegen.',
      options: ['Kurz und knapp', 'Ausgewogen', 'Ausführlich'],
      multiple: false,
    },
  },
  {
    kind: 'question',
    question: {
      id: 'tools',
      label: 'Arbeitet mit',
      title: 'Womit arbeiten Sie am meisten?',
      note: 'So weiß Ayunis Core, in welcher Form Ergebnisse am meisten helfen.',
      options: ['E-Mails', 'Dokumente', 'Vorlagen und Formulare'],
      multiple: true,
    },
  },
  {
    kind: 'memory',
    text: 'Jetzt kennen wir uns schon besser. Das weiß Ayunis Core ab sofort über Sie:',
  },
];
