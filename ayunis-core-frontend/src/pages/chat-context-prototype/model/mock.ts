import {
  RESEARCH_HITS,
  RESEARCH_HIT_IDS,
} from '@/pages/chat-context-prototype/model/research-hits';
import { SOURCE_HITS } from '@/pages/chat-context-prototype/model/source-hits';

export { SOURCE_HITS };
import type {
  DocumentSourceHit,
  SourceHit,
  WebSourceHit,
} from '@/pages/chat-context-prototype/model/source-hit';

export type { DocumentSourceHit, SourceHit, WebSourceHit };
export {
  isAudio,
  isPaginated,
  isPlainText,
  isTabular,
} from '@/pages/chat-context-prototype/model/source-hit';

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
  attachedKnowledge?: string[];
  attachedFiles?: string[];
  attachedIntegrations?: string[];
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
      'Aufbau\n1. Kernbotschaft in einem Satz: Was passiert, ab wann, für wen.\n2. Rahmen: Adresse, Öffnungszeiten, Erreichbarkeit.\n3. Barrierefreiheit, wenn ein Gebäude betroffen ist.\n4. Rückfragehinweis der Pressestelle.\n\nSprache\nKurze Sätze, ein Gedanke pro Satz. Fachbegriffe beim ersten Auftreten erklären. Kein Werbeton, keine Superlative, keine Bewertungen der eigenen Arbeit.\n\nZahlen und Daten\nDatumsangaben immer ausschreiben, Uhrzeiten im Format 8 bis 16 Uhr. Beträge in Euro mit Tausenderpunkt. Beschlüsse mit Gremium und Sitzungsdatum benennen, damit die Angabe nachprüfbar bleibt.\n\nZuständigkeiten\nFederführung nennen, wenn mehrere Ämter beteiligt sind. Bei Bauvorhaben zusätzlich das Bauamt als Ansprechpartner aufführen. Externe Beteiligte nur mit vorheriger Zustimmung nennen.\n\nBarrierefreiheit\nBei Gebäuden immer angeben: stufenloser Zugang, Aufzug, Leitsystem, barrierefreie Toilette. Fehlt eines davon, wird es offen benannt statt weggelassen.\n\nBilder\nBildunterschrift mit Ort, Anlass und Namen der abgebildeten Personen. Bildrechte im Anhang vermerken.\n\nFreigabe\nVor Veröffentlichung gibt die Amtsleitung frei. Der Rückfragehinweis bleibt immer im Text. Bei Themen mit politischer Wirkung geht der Text zusätzlich an das Büro der Bürgermeisterin.\n\nNach der Veröffentlichung\nDer Text wird im Pressearchiv abgelegt und auf der Website unter Aktuelles verlinkt.',
    attachedKnowledge: ['Pressearchiv der Stadt'],
    attachedFiles: [
      'Musterpressemitteilung.pdf',
      'Freigabehinweise der Pressestelle.pdf',
    ],
    attachedIntegrations: ['Ratsinformationssystem'],
  },
  'skill-aktenzeichen-2': {
    id: 'skill-aktenzeichen-2',
    kind: 'skill',
    name: 'Aktenzeichen prüfen',
    detail: 'Gleicht Aktenzeichen mit dem Registraturplan ab',
    origin: 'always',
    purpose:
      'Prüft Aktenzeichen gegen den Registraturplan und schlägt das passende Zeichen vor, wenn keines angegeben ist.',
    instructions:
      'Aktenzeichen immer gegen den Registraturplan prüfen. Ist keines angegeben, das passende vorschlagen und begründen. Bei Unklarheit die Registratur als Ansprechpartner nennen.',
    attachedFiles: ['Registraturplan 2026.pdf'],
  },
  'skill-amtsdeutsch': {
    id: 'skill-amtsdeutsch',
    kind: 'skill',
    name: 'Amtsdeutsch vereinfachen',
    detail: 'Formuliert Entwürfe in verständlicher Sprache',
    origin: 'always',
    purpose:
      'Ersetzt Behördensprache durch kurze Sätze und erklärt Fachbegriffe beim ersten Auftreten.',
    instructions:
      'Passivkonstruktionen auflösen. Schachtelsätze in Hauptsätze trennen. Fachbegriffe beim ersten Auftreten in Klammern erklären. Keine Abkürzungen ohne Auflösung.',
    attachedKnowledge: ['Satzungen und Ortsrecht'],
    attachedFiles: ['Einfache Sprache — Handreichung.pdf'],
  },
  'skill-protokoll': {
    id: 'skill-protokoll',
    kind: 'skill',
    name: 'Protokoll zusammenfassen',
    detail: 'Fasst Sitzungsprotokolle auf Beschlüsse zusammen',
    origin: 'always',
    purpose:
      'Zieht aus einem Protokoll die Beschlüsse, Zuständigkeiten und Fristen heraus.',
  },
  'skill-ratsvorlage-2': {
    id: 'skill-ratsvorlage-2',
    kind: 'skill',
    name: 'Ratsvorlage erstellen',
    detail: 'Aufbau und Tonfall für Vorlagen an den Rat',
    origin: 'always',
    purpose:
      'Gliedert Vorlagen in Beschlussvorschlag, Sachverhalt und finanzielle Auswirkungen.',
  },
  'skill-stellungnahme': {
    id: 'skill-stellungnahme',
    kind: 'skill',
    name: 'Stellungnahme entwerfen',
    detail: 'Entwürfe für Stellungnahmen an Dritte',
    origin: 'always',
    purpose:
      'Formuliert Stellungnahmen mit Sachstand, Bewertung und Ergebnis in drei Absätzen.',
  },
  'kb-satzungen': {
    id: 'kb-satzungen',
    kind: 'knowledgeBase',
    name: 'Satzungen und Ortsrecht',
    detail: '86 Dokumente',
    origin: 'always',
    purpose:
      'Alle geltenden Satzungen der Stadt, fortgeschrieben durch das Rechtsamt.',
  },
  'kb-personal': {
    id: 'kb-personal',
    kind: 'knowledgeBase',
    name: 'Personalhandbuch',
    detail: '41 Dokumente',
    origin: 'always',
    purpose: 'Dienstanweisungen, Formulare und Regelungen der Personalstelle.',
  },
  'kb-protokolle': {
    id: 'kb-protokolle',
    kind: 'knowledgeBase',
    name: 'Sitzungsprotokolle 2019–2026',
    detail: '204 Dokumente',
    origin: 'always',
    purpose: 'Protokolle von Rat, Hauptausschuss und Fachausschüssen.',
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

export const AVAILABLE_COUNTS = {
  skills: 12,
  knowledgeBases: 8,
};

export const ALL_SOURCE_HITS: Record<string, SourceHit> = {
  ...SOURCE_HITS,
  ...RESEARCH_HITS,
};

export const STANDBY_SKILL_IDS = [
  'skill-aktenzeichen-2',
  'skill-amtsdeutsch',
  'skill-protokoll',
  'skill-ratsvorlage-2',
  'skill-stellungnahme',
];

export const KNOWLEDGE_BASE_IDS = [
  'kb-presse',
  'kb-bauleitplanung',
  'kb-satzungen',
  'kb-personal',
  'kb-protokolle',
];

export const KNOWLEDGE_BASE_BY_DOCUMENT: Record<string, string> = {};

export const DOCUMENTS_BY_KNOWLEDGE_BASE: Record<string, string[]> = {
  'kb-presse': [
    'hit-presse-vorlage',
    'doc-leitfaden',
    'doc-eroeffnung-2024',
    'doc-sprachleitfaden',
  ],
  'kb-bauleitplanung': [
    'doc-stellplatzsatzung',
    'hit-verkehrsplan',
    'doc-lageplan',
    'doc-verkehrszaehlung-fehler',
  ],
  'kb-satzungen': [
    'doc-stellplatzsatzung',
    'doc-gebuehrensatzung',
    'web-ortsrecht',
    'web-ortsrecht-bauen',
  ],
  'kb-personal': ['doc-dienstanweisung', 'doc-stellenplan', 'doc-onboarding'],
  'kb-protokolle': [
    'hit-buergerbuero',
    'hit-oeffnungszeiten',
    'doc-protokoll-ha',
    'doc-ratssitzung',
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
  'msg-frage-recherche': {
    id: 'msg-frage-recherche',
    kind: 'user',
    text: 'Wie halten andere Städte das mit Öffnungszeiten und offener Sprechstunde? Und was sagen die Vorgaben zur Barrierefreiheit?',
  },
  'msg-antwort-recherche': {
    id: 'msg-antwort-recherche',
    kind: 'assistant',
    text: `Kurz zusammengefasst: die meisten vergleichbaren Städte kombinieren feste Kernzeiten mit einer offenen Sprechstunde, und die Vorgaben zur Barrierefreiheit ergeben sich aus [DIN 18040-1](https://www.din.de/) sowie dem [Barrierefreiheitsstärkungsgesetz](https://www.bfsg-gesetz.de/).

**Öffnungszeiten**
Münster und Freiburg fahren beide mit einem langen Tag pro Woche, Leipzig ergänzt Termine um eine offene Stunde am Morgen. Der [Vergleich des Difu](https://www.difu.de/) zeigt: Häuser mit offener Sprechstunde bekommen bessere Bewertungen, brauchen aber mehr Personal in der Spitze.

**Barrierefreiheit**
Stufenloser Zugang, Aufzug und ein Leitsystem in einfacher Sprache sind der Mindeststandard. Für den Umbau gibt es ein [Förderprogramm des Landes](https://www.mhkbd.nrw/) — Anträge müssen vor Beginn der Maßnahme gestellt werden.

Für unseren Fall heißt das: die beschlossenen Zeiten liegen im üblichen Rahmen, eine offene Sprechstunde wäre die naheliegende Ergänzung.`,
    sourceIds: RESEARCH_HIT_IDS,
  },
  'msg-frage-kurz': {
    id: 'msg-frage-kurz',
    kind: 'user',
    text: 'Danke. Kannst du den Betreff für die Mail an die Redaktionen vorschlagen?',
  },
  'msg-antwort-kurz': {
    id: 'msg-antwort-kurz',
    kind: 'assistant',
    text: 'Vorschlag: „Neues Bürgerbüro in der Marktstraße öffnet am 15. September". Kurz, mit Ort und Datum — das reicht Redaktionen für die Einordnung.',
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

for (const [baseId, documentIds] of Object.entries(
  DOCUMENTS_BY_KNOWLEDGE_BASE,
)) {
  for (const documentId of documentIds) {
    KNOWLEDGE_BASE_BY_DOCUMENT[documentId] ??= baseId;
  }
}
