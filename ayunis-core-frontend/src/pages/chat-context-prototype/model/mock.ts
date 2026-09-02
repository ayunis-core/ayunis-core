export type ContextOrigin = 'always' | 'user' | 'assistant' | 'project';

export type ContextKind = 'skill' | 'knowledgeBase' | 'file' | 'integration';

export interface ContextItem {
  id: string;
  kind: ContextKind;
  name: string;
  detail: string;
  origin: ContextOrigin;
  purpose?: string;
  instructions?: string;
  brings?: string[];
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
  'skill-pressemitteilung': {
    id: 'skill-pressemitteilung',
    kind: 'skill',
    name: 'Pressemitteilung erstellen',
    detail: 'Aufbau, Tonfall und Freigabehinweise für Pressetexte',
    origin: 'assistant',
    purpose:
      'Gliedert Pressetexte nach dem Aufbau der Stadtverwaltung: Kernbotschaft zuerst, dann Details, am Ende der Rückfragehinweis. Formuliert in verständlicher Sprache und ohne Werbeton.',
    instructions:
      'Aufbau\n1. Kernbotschaft in einem Satz: Was passiert, ab wann, für wen.\n2. Rahmen: Adresse, Öffnungszeiten, Erreichbarkeit.\n3. Barrierefreiheit, wenn ein Gebäude betroffen ist.\n4. Rückfragehinweis der Pressestelle.\n\nSprache\nKurze Sätze, ein Gedanke pro Satz. Fachbegriffe beim ersten Auftreten erklären. Kein Werbeton, keine Superlative.\n\nFreigabe\nVor Veröffentlichung gibt die Amtsleitung frei. Der Rückfragehinweis bleibt immer im Text.',
    brings: [
      'Musterpressemitteilung.pdf',
      'Pressearchiv der Stadt',
      'Freigabehinweise der Pressestelle',
    ],
  },
  'kb-presse': {
    id: 'kb-presse',
    kind: 'knowledgeBase',
    name: 'Pressearchiv der Stadt',
    detail: '312 Dokumente',
    origin: 'always',
    purpose:
      'Alle veröffentlichten Pressemitteilungen seit 2019. In diesem Chat wurde darin nach vergleichbaren Eröffnungsmeldungen gesucht.',
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
  'artifact-pressemitteilung': {
    id: 'artifact-pressemitteilung',
    name: 'Pressemitteilung Bürgerbüro',
    type: 'document',
    preview: '',
  },
  'artifact-oeffnungszeiten': {
    id: 'artifact-oeffnungszeiten',
    name: 'Öffnungszeiten Aushang',
    type: 'spreadsheet',
    preview: '',
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

export const AVAILABLE_COUNTS = {
  skills: 12,
  knowledgeBases: 8,
};

export const SOURCE_HITS: Record<string, SourceHit> = {
  'hit-presse-vorlage-2': {
    id: 'hit-presse-vorlage-2',
    kind: 'document',
    title: 'Musterpressemitteilung.pdf',
    location: 'Seite 2',
    page: 2,
    pageCount: 3,
    heading: 'Rückfragen und Freigabe',
    passage:
      'Jede Pressemitteilung schließt mit dem Rückfragehinweis der Pressestelle. Die Freigabe erfolgt durch die Amtsleitung.',
  },
  'hit-buergerbuero': {
    id: 'hit-buergerbuero',
    kind: 'document',
    title: 'Beschluss Bürgerbüro.pdf',
    location: 'Seite 2',
    page: 2,
    pageCount: 6,
    heading: 'Beschluss des Hauptausschusses',
    passage:
      'Der Hauptausschuss beschließt die Einrichtung des Bürgerbüros in der Marktstraße 12 mit Öffnung zum 15. September.',
  },
  'hit-oeffnungszeiten': {
    id: 'hit-oeffnungszeiten',
    kind: 'document',
    title: 'Beschluss Bürgerbüro.pdf',
    location: 'Seite 4',
    page: 4,
    pageCount: 6,
    heading: 'Öffnungszeiten',
    passage:
      'Die Öffnungszeiten werden auf montags bis freitags 8 bis 16 Uhr festgelegt, donnerstags bis 18 Uhr.',
  },
  'hit-barrierefreiheit': {
    id: 'hit-barrierefreiheit',
    kind: 'web',
    title: 'Barrierefreie Verwaltungsgebäude — Leitfaden',
    siteName: 'bmi.bund.de',
    url: 'https://www.bmi.bund.de/',
    retrievedAt: 'Abgerufen heute',
    passage:
      'Verwaltungsgebäude sollen stufenlos erreichbar sein; Leitsysteme in einfacher Sprache erleichtern die Orientierung.',
  },
  'doc-leitfaden': {
    id: 'doc-leitfaden',
    kind: 'document',
    title: 'Leitfaden Pressearbeit.pdf',
    location: 'Seite 1',
    page: 1,
    pageCount: 24,
    heading: 'Grundsätze der Pressearbeit',
    passage:
      'Mitteilungen der Verwaltung sind sachlich, überprüfbar und in verständlicher Sprache zu formulieren.',
  },
  'doc-eroeffnung-2024': {
    id: 'doc-eroeffnung-2024',
    kind: 'document',
    title: 'PM Eröffnung Stadtbibliothek 2024.pdf',
    location: 'Seite 1',
    page: 1,
    pageCount: 2,
    heading: 'Stadtbibliothek eröffnet im Bürgerzentrum',
    passage:
      'Die Stadtbibliothek zieht in das Bürgerzentrum und öffnet dort ab dem 3. Juni mit erweiterten Zeiten.',
  },
  'doc-sprachleitfaden': {
    id: 'doc-sprachleitfaden',
    kind: 'document',
    title: 'Einfache Sprache — Handreichung.pdf',
    location: 'Seite 3',
    page: 3,
    pageCount: 12,
    heading: 'Sätze kürzen',
    passage:
      'Ein Satz enthält einen Gedanken. Fachbegriffe werden beim ersten Auftreten erklärt.',
  },
  'hit-presse-vorlage': {
    id: 'hit-presse-vorlage',
    kind: 'document',
    title: 'Musterpressemitteilung.pdf',
    location: 'Seite 1',
    page: 1,
    pageCount: 3,
    heading: 'Aufbau einer Pressemitteilung',
    passage:
      'Die Kernbotschaft steht im ersten Absatz. Öffnungszeiten, Erreichbarkeit und Barrierefreiheit folgen, der Rückfragehinweis schließt den Text ab.',
  },
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

export const DOCUMENTS_BY_KNOWLEDGE_BASE: Record<string, string[]> = {
  'kb-presse': [
    'hit-presse-vorlage',
    'doc-leitfaden',
    'doc-eroeffnung-2024',
    'doc-sprachleitfaden',
    'hit-buergerbuero',
  ],
};

export const TRANSCRIPT: Record<string, TranscriptEntry> = {
  'msg-presse-frage': {
    id: 'msg-presse-frage',
    kind: 'user',
    text: 'Erstelle mir eine Pressemitteilung zur Eröffnung des neuen Bürgerbüros in der Marktstraße.',
  },
  'entry-presse-aktivierung': {
    id: 'entry-presse-aktivierung',
    kind: 'activation',
    contextItemId: 'skill-pressemitteilung',
  },
  'msg-presse-antwort': {
    id: 'msg-presse-antwort',
    kind: 'assistant',
    text: 'Ich habe die Eckdaten aus der Vorlage übernommen und den Text nach dem üblichen Aufbau gegliedert: Kernbotschaft zuerst, dann Öffnungszeiten und Barrierefreiheit, am Ende der Rückfragehinweis.',
    sourceIds: ['hit-presse-vorlage'],
  },
  'msg-presse-antwort-viele': {
    id: 'msg-presse-antwort-viele',
    kind: 'assistant',
    text: 'Ich habe Beschluss, Musterpressemitteilung und den Leitfaden zur Barrierefreiheit ausgewertet und die Angaben gegeneinander geprüft. Öffnungszeiten und Adresse stammen aus dem Beschluss, Aufbau und Freigabehinweis aus der Musterpressemitteilung.',
    sourceIds: [
      'hit-presse-vorlage',
      'hit-presse-vorlage-2',
      'hit-buergerbuero',
      'hit-oeffnungszeiten',
      'hit-barrierefreiheit',
    ],
  },
  'msg-frage-tabelle': {
    id: 'msg-frage-tabelle',
    kind: 'user',
    text: 'Kannst du die Öffnungszeiten noch als Tabelle für den Aushang aufbereiten? Din A4, gut lesbar.',
  },
  'msg-antwort-tabelle': {
    id: 'msg-antwort-tabelle',
    kind: 'assistant',
    text: 'Ich habe die Zeiten aus dem Beschluss in eine Tabelle übernommen: Wochentag, Uhrzeit und ein Hinweisfeld für den langen Donnerstag. Die Schriftgröße ist für einen Aushang in A4 gewählt.',
    sourceIds: ['hit-oeffnungszeiten'],
  },
  'entry-artefakt-tabelle': {
    id: 'entry-artefakt-tabelle',
    kind: 'artifact',
    artifactId: 'artifact-oeffnungszeiten',
  },
  'msg-frage-barrierefrei': {
    id: 'msg-frage-barrierefrei',
    kind: 'user',
    text: 'Ergänze in der Pressemitteilung bitte noch einen Satz zur Barrierefreiheit.',
  },
  'msg-antwort-barrierefrei': {
    id: 'msg-antwort-barrierefrei',
    kind: 'assistant',
    text: 'Ergänzt: stufenloser Zugang, Aufzug zwischen den Etagen und ein Leitsystem in einfacher Sprache. Ich habe mich an den Formulierungen des Bundesleitfadens orientiert, damit die Angaben prüfbar bleiben.',
    sourceIds: ['hit-barrierefreiheit'],
  },
  'msg-frage-freigabe': {
    id: 'msg-frage-freigabe',
    kind: 'user',
    text: 'Wer muss den Text vor der Veröffentlichung freigeben?',
  },
  'msg-antwort-freigabe': {
    id: 'msg-antwort-freigabe',
    kind: 'assistant',
    text: 'Nach der Musterpressemitteilung gibt die Amtsleitung frei, der Rückfragehinweis der Pressestelle bleibt im Text. Ich habe den Hinweis am Ende schon eingesetzt.',
    sourceIds: ['hit-presse-vorlage-2'],
  },
  'entry-presse-artefakt': {
    id: 'entry-presse-artefakt',
    kind: 'artifact',
    artifactId: 'artifact-pressemitteilung',
  },
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
