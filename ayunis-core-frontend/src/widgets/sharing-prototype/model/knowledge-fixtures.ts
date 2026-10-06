import type { LinkedKnowledge, PrototypeKnowledge } from './types';

export const KNOWLEDGE_COLLECTIONS: PrototypeKnowledge[] = [
  {
    id: 'eigene-textbausteine',
    name: 'Eigene Textbausteine',
    description: 'Formulierungen, die Lena häufig verwendet.',
    owner: { kind: 'user', userId: 'lena' },
    documentCount: 6,
  },
  {
    id: 'bauleitplanung-notizen',
    name: 'Notizen Bauleitplanung',
    description: 'Gesprächsnotizen und Vermerke zu laufenden Verfahren.',
    owner: { kind: 'user', userId: 'lena' },
    documentCount: 14,
  },
  {
    id: 'kassenpruefung',
    name: 'Unterlagen Kassenprüfung',
    description: 'Prüfberichte und Checklisten der letzten Kassenprüfungen.',
    owner: { kind: 'user', userId: 'tobias' },
    documentCount: 9,
  },
  {
    id: 'kaemmerei-richtlinien',
    name: 'Richtlinien der Kämmerei',
    description: 'Buchungs- und Haushaltsrichtlinien der Kämmerei.',
    owner: { kind: 'team', teamId: 'kaemmerei' },
    documentCount: 23,
  },
  {
    id: 'bauamt-merkblaetter',
    name: 'Merkblätter Bauamt',
    description: 'Merkblätter und Formulare des Bauamts.',
    owner: { kind: 'team', teamId: 'bauamt' },
    documentCount: 31,
  },
  {
    id: 'dienstanweisungen',
    name: 'Dienstanweisungen',
    description: 'Geltende Dienstanweisungen der Verwaltung.',
    owner: { kind: 'org' },
    documentCount: 48,
  },
  {
    id: 'buergerkommunikation',
    name: 'Leitfaden Bürgerkommunikation',
    description:
      'Regeln für verständliche Schreiben an Bürgerinnen und Bürger.',
    owner: { kind: 'org' },
    documentCount: 5,
  },
  {
    id: 'datenschutzhinweise',
    name: 'Datenschutzhinweise',
    description: 'Vorgaben zum Umgang mit personenbezogenen Daten.',
    owner: { kind: 'org' },
    documentCount: 12,
  },
];

export const INITIAL_LINKED_KNOWLEDGE: Partial<
  Record<string, LinkedKnowledge[]>
> = {
  'haushalt-2027': [{ knowledgeId: 'dienstanweisungen', linkedBy: 'tobias' }],
};
