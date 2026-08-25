export type ContextOrigin = 'always' | 'user' | 'assistant' | 'project';

export type ContextKind = 'skill' | 'knowledgeBase' | 'file' | 'integration';

export interface ContextItem {
  id: string;
  kind: ContextKind;
  name: string;
  detail: string;
  origin: ContextOrigin;
}

export type ArtifactType = 'document' | 'spreadsheet' | 'diagram';

export interface ArtifactItem {
  id: string;
  name: string;
  type: ArtifactType;
  preview: string;
}

export type TranscriptEntry =
  | { id: string; kind: 'user'; text: string }
  | { id: string; kind: 'assistant'; text: string; sourceIds?: string[] }
  | { id: string; kind: 'activation'; contextItemId: string }
  | { id: string; kind: 'artifact'; artifactId: string };

export const CONTEXT_ITEMS: Record<string, ContextItem> = {
  'kb-bauleitplanung': {
    id: 'kb-bauleitplanung',
    kind: 'knowledgeBase',
    name: 'Bauleitplanung 2026',
    detail: '48 Dokumente',
    origin: 'always',
  },
  'file-stellplatzsatzung': {
    id: 'file-stellplatzsatzung',
    kind: 'file',
    name: 'Stellplatzsatzung.pdf',
    detail: 'PDF',
    origin: 'user',
  },
  'skill-ratsvorlage': {
    id: 'skill-ratsvorlage',
    kind: 'skill',
    name: 'Ratsvorlage erstellen',
    detail: 'Aufbau und Tonfall für Vorlagen an den Rat',
    origin: 'user',
  },
  'file-radverkehr': {
    id: 'file-radverkehr',
    kind: 'file',
    name: 'Radverkehrskonzept.pdf',
    detail: 'PDF',
    origin: 'user',
  },
  'file-verkehrszaehlung': {
    id: 'file-verkehrszaehlung',
    kind: 'file',
    name: 'Verkehrszählung 2026.xlsx',
    detail: 'Tabelle',
    origin: 'user',
  },
  'integration-ris': {
    id: 'integration-ris',
    kind: 'integration',
    name: 'Ratsinformationssystem',
    detail: 'Integration',
    origin: 'assistant',
  },
  'skill-aktenzeichen': {
    id: 'skill-aktenzeichen',
    kind: 'skill',
    name: 'Aktenzeichen prüfen',
    detail: 'Gleicht Aktenzeichen mit dem Registraturplan ab',
    origin: 'assistant',
  },
  'kb-projekt': {
    id: 'kb-projekt',
    kind: 'knowledgeBase',
    name: 'Stadtentwicklung Innenstadt',
    detail: '112 Dokumente',
    origin: 'project',
  },
  'skill-projekt': {
    id: 'skill-projekt',
    kind: 'skill',
    name: 'Amtsdeutsch vereinfachen',
    detail: 'Formuliert Entwürfe in verständlicher Sprache',
    origin: 'project',
  },
};

export const ARTIFACTS: Record<string, ArtifactItem> = {
  'artifact-vorlage': {
    id: 'artifact-vorlage',
    name: 'Ratsvorlage Stellplatzsatzung',
    type: 'document',
    preview:
      'Beschlussvorschlag\n\nDer Rat der Stadt beschließt die Änderung der Stellplatzsatzung in der vorliegenden Fassung.\n\nSachverhalt\n\nDie geltende Stellplatzsatzung stammt aus dem Jahr 2014 und bildet die veränderte Mobilitätslage im Innenstadtbereich nicht mehr ab. Die Verwaltung schlägt vor, den Stellplatzschlüssel für Wohnnutzungen abzusenken und Abstellflächen für Fahrräder verbindlich festzuschreiben.',
  },
  'artifact-fristen': {
    id: 'artifact-fristen',
    name: 'Fristenübersicht Beteiligung',
    type: 'spreadsheet',
    preview:
      'Verfahrensschritt · Frist · Zuständig\nFrühzeitige Beteiligung · 14.09.2026 · Bauamt\nOffenlage · 12.10.2026 · Bauamt\nRatsbeschluss · 06.11.2026 · Ratsbüro',
  },
};

export interface DocumentSourceHit {
  id: string;
  kind: 'document';
  title: string;
  location: string;
  page: number;
  pageCount: number;
  heading: string;
  passage: string;
}

export interface WebSourceHit {
  id: string;
  kind: 'web';
  title: string;
  siteName: string;
  url: string;
  retrievedAt: string;
  passage: string;
}

export type SourceHit = DocumentSourceHit | WebSourceHit;

export const SOURCE_HITS: Record<string, SourceHit> = {
  'hit-satzung': {
    id: 'hit-satzung',
    kind: 'document',
    title: 'Stellplatzsatzung.pdf',
    location: 'Seite 4, § 3 Absatz 2',
    page: 4,
    pageCount: 12,
    heading: '§ 3 Nachweis von Stellplätzen',
    passage:
      '(2) Für Wohnungen mit nicht mehr als 50 m² Wohnfläche ist ein Stellplatz je Wohnung nachzuweisen. Für größere Wohnungen sind 1,5 Stellplätze je Wohnung nachzuweisen.',
  },
  'hit-verkehrsplan': {
    id: 'hit-verkehrsplan',
    kind: 'document',
    title: 'Verkehrsentwicklungsplan 2024.pdf',
    location: 'Seite 17',
    page: 17,
    pageCount: 42,
    heading: '4.2 Entwicklung der Haushaltsmotorisierung',
    passage:
      'Im Innenstadtbereich ist der Anteil autofreier Haushalte zwischen 2018 und 2024 von 22 auf 31 Prozent gestiegen.',
  },
  'hit-baunvo': {
    id: 'hit-baunvo',
    kind: 'web',
    title: 'BauNVO § 12 Stellplätze und Garagen',
    siteName: 'gesetze-im-internet.de',
    url: 'https://www.gesetze-im-internet.de/baunvo/__12.html',
    retrievedAt: 'Abgerufen heute',
    passage:
      'Stellplätze und Garagen sind in allen Baugebieten zulässig, soweit sich aus den Absätzen 2 bis 6 nichts anderes ergibt.',
  },
};

export const TRANSCRIPT: Record<string, TranscriptEntry> = {
  'msg-frage': {
    id: 'msg-frage',
    kind: 'user',
    text: 'Erstelle eine Ratsvorlage zur Änderung der Stellplatzsatzung. Nimm die geltende Satzung als Grundlage.',
  },
  'msg-antwort-1': {
    id: 'msg-antwort-1',
    kind: 'assistant',
    text: 'Ich habe die geltende Stellplatzsatzung und die Unterlagen aus der Bauleitplanung ausgewertet. Der Stellplatzschlüssel für Wohnnutzungen ist der Punkt, an dem die Änderung ansetzt.',
    sourceIds: ['hit-satzung', 'hit-verkehrsplan'],
  },
  'entry-aktivierung': {
    id: 'entry-aktivierung',
    kind: 'activation',
    contextItemId: 'skill-aktenzeichen',
  },
  'msg-antwort-2': {
    id: 'msg-antwort-2',
    kind: 'assistant',
    text: 'Das Aktenzeichen 61.2-14/26 passt zum Registraturplan und ist in der Vorlage übernommen. Die geplante Absenkung bleibt im Rahmen dessen, was die Baunutzungsverordnung zulässt.',
    sourceIds: ['hit-baunvo'],
  },
  'entry-artefakt': {
    id: 'entry-artefakt',
    kind: 'artifact',
    artifactId: 'artifact-vorlage',
  },
};
