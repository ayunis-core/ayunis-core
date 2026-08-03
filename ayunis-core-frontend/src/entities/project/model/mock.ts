import type { ProjectColor, ProjectIconKey } from './appearance';

export interface ProjectSkill {
  id: string;
  name: string;
}

export interface ProjectKnowledgeBase {
  id: string;
  name: string;
  documentCount: number;
}

export type GeneratedContentKind = 'document' | 'diagram' | 'chart' | 'email';

export type GeneratedContentGroup = 'document' | 'diagram' | 'email';

export const GENERATED_CONTENT_GROUP: Record<
  GeneratedContentKind,
  GeneratedContentGroup
> = {
  document: 'document',
  diagram: 'diagram',
  chart: 'diagram',
  email: 'email',
};

export const GENERATED_CONTENT_LABELS: Record<GeneratedContentGroup, string> = {
  document: 'Dokumente',
  diagram: 'Diagramme',
  email: 'E-Mail-Entwürfe',
};

export const GENERATED_CONTENT_ORDER: GeneratedContentGroup[] = [
  'document',
  'diagram',
  'email',
];

export interface MockChartParams {
  chartTitle: string;
  xAxis: string[];
  yAxis: { label: string; values: number[] }[];
  insight?: string;
}

export interface MockEmailParams {
  to: string;
  subject: string;
  body: string;
}

export interface ProjectDocument {
  id: string;
  name: string;
  shared?: boolean;
  chatId?: string;
  content?: string;
  kind?: GeneratedContentKind;
  chart?: MockChartParams;
  email?: MockEmailParams;
}

export type ProjectRole = 'full' | 'edit' | 'use';

export const PROJECT_ROLE_ORDER: ProjectRole[] = ['full', 'edit', 'use'];

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  full: 'Vollzugriff',
  edit: 'Kann bearbeiten',
  use: 'Kann chatten',
};

export const PROJECT_ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
  full: 'Mitglieder einladen, Einstellungen ändern, Inhalte pflegen',
  edit: 'Skills, Wissen und Dokumente pflegen',
  use: 'Im Projekt chatten, Skills und Wissen nutzen',
};

export interface ProjectCollaborator {
  id: string;
  name: string;
  initials: string;
  email: string;
  role: ProjectRole;
  pending?: boolean;
  blocked?: boolean;
}

export interface OrgPerson {
  id: string;
  name: string;
  initials: string;
  email: string;
}

export interface OrgTeam {
  id: string;
  name: string;
  memberCount: number;
  memberIds?: string[];
}

export interface ProjectTeam extends OrgTeam {
  role: ProjectRole;
}

export interface ProjectMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface ProjectChat {
  id: string;
  title: string;
  pinned?: boolean;
  messages: ProjectMessage[];
}

export type ProjectVisibility = 'private' | 'org';

export interface MockProject {
  id: string;
  name: string;
  icon: ProjectIconKey;
  color: ProjectColor;
  instructions?: string;
  prompt?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  visibility: ProjectVisibility;
  starred: boolean;
  allowMemberContent: boolean;
  allowPrivateChats: boolean;
  allowContentSharing?: boolean;
  skills: ProjectSkill[];
  knowledgeBases: ProjectKnowledgeBase[];
  documents: ProjectDocument[];
  generatedDocuments?: ProjectDocument[];
  autoDeleteDays?: number;
  enforceAnonymization?: boolean;
  teams: ProjectTeam[];
  collaborators: ProjectCollaborator[];
  chats: ProjectChat[];
}

export const CURRENT_USER: ProjectCollaborator = {
  id: 'u1',
  name: 'Anna Muster',
  initials: 'AM',
  email: 'anna@musterstadt.de',
  role: 'full',
};

export const orgPeople: OrgPerson[] = [
  { id: 'u2', name: 'Tim Krause', initials: 'TK', email: 'tim@musterstadt.de' },
  { id: 'u3', name: 'Lena Berg', initials: 'LB', email: 'lena@musterstadt.de' },
  {
    id: 'u4',
    name: 'Petra Sommer',
    initials: 'PS',
    email: 'petra@musterstadt.de',
  },
  {
    id: 'u5',
    name: 'Ralf Stein',
    initials: 'RS',
    email: 'ralf@musterstadt.de',
  },
  {
    id: 'u6',
    name: 'Meike Pohl',
    initials: 'MP',
    email: 'meike@musterstadt.de',
  },
  {
    id: 'u7',
    name: 'Jonas Wolf',
    initials: 'JW',
    email: 'jonas@musterstadt.de',
  },
  { id: 'u8', name: 'Sara Vogt', initials: 'SV', email: 'sara@musterstadt.de' },
  { id: 'u9', name: 'Ben Klein', initials: 'BK', email: 'ben@musterstadt.de' },
  {
    id: 'u10',
    name: 'Nina Roth',
    initials: 'NR',
    email: 'nina@musterstadt.de',
  },
  { id: 'u11', name: 'Tom Frey', initials: 'TF', email: 'tom@musterstadt.de' },
];

export const MY_TEAM_IDS: string[] = ['t1', 't2'];

export const orgTeams: OrgTeam[] = [
  {
    id: 't1',
    name: 'Personalabteilung',
    memberCount: 4,
    memberIds: ['u2', 'u3', 'u4', 'u7'],
  },
  { id: 't2', name: 'Beschaffung', memberCount: 2, memberIds: ['u5', 'u6'] },
  {
    id: 't3',
    name: 'Rechtsamt',
    memberCount: 3,
    memberIds: ['u3', 'u5', 'u8'],
  },
  {
    id: 't4',
    name: 'Bürgerservice',
    memberCount: 8,
    memberIds: ['u2', 'u4', 'u6', 'u7', 'u8', 'u9', 'u10', 'u11'],
  },
];

export const SKILL_DESCRIPTIONS: Record<string, string> = {
  Antwortentwurf:
    'Formuliert einen freundlichen Antwortvorschlag auf Anfragen.',
  'Formular finden': 'Ordnet einem Anliegen das passende Formular zu.',
  'Bewerbung sichten':
    'Vergleicht eine Bewerbung mit dem hinterlegten Stellenprofil.',
  Urlaubsregeln: 'Beantwortet Fragen zu Urlaub und Arbeitszeit.',
  'Angebote vergleichen':
    'Stellt Angebote gegenüber und prüft die Vergabekriterien.',
  'Protokoll zusammenfassen':
    'Fasst Sitzungsprotokolle auf die wichtigsten Punkte zusammen.',
  'Text übersetzen': 'Übersetzt Texte und behält den amtlichen Tonfall.',
};

export const availableSkills: ProjectSkill[] = [
  { id: 'ps1', name: 'Antwortentwurf' },
  { id: 'ps2', name: 'Formular finden' },
  { id: 'ps3', name: 'Bewerbung sichten' },
  { id: 'ps4', name: 'Urlaubsregeln' },
  { id: 'ps5', name: 'Angebote vergleichen' },
  { id: 'ps6', name: 'Protokoll zusammenfassen' },
  { id: 'ps7', name: 'Text übersetzen' },
];

export const KNOWLEDGE_BASE_FILES: Record<string, string[]> = {
  'Satzungen & Gebühren': [
    'Gebuehrensatzung-2026.pdf',
    'Abfallsatzung.pdf',
    'Hundesteuersatzung.pdf',
    'Marktsatzung.pdf',
    'Sondernutzungsgebuehren.pdf',
    'Friedhofsgebuehren.pdf',
    'Verwaltungskostensatzung.pdf',
    'Elternbeitragssatzung.pdf',
  ],
  Dienstvereinbarungen: [
    'Gleitzeit-Vereinbarung.pdf',
    'Mobiles-Arbeiten.pdf',
    'Urlaubsgrundsaetze.pdf',
    'Fortbildungsrichtlinie.pdf',
    'Dienstreisen.pdf',
    'Betriebliches-Eingliederungsmanagement.pdf',
    'Arbeitszeitkonten.pdf',
    'Telefon-und-IT-Nutzung.pdf',
    'Sucht-und-Praevention.pdf',
    'Konfliktmanagement.pdf',
  ],
  Stellenprofile: [
    'Sachbearbeitung-Buergerbuero.pdf',
    'Sachbearbeitung-Vergabe.pdf',
    'Amtsleitung-Ordnungsamt.pdf',
    'Auszubildende-VFA.pdf',
    'Sachbearbeitung-Bauamt.pdf',
    'Teamleitung-Personal.pdf',
  ],
  Vergaberecht: [
    'VOB-A-Auszug.pdf',
    'UVgO-Kommentar.pdf',
    'Schwellenwerte-2026.pdf',
    'Vergabevermerk-Vorlage.docx',
    'Eignungskriterien-Checkliste.pdf',
    'Leistungsbeschreibung-Muster.docx',
    'Bekanntmachung-Muster.docx',
    'Preisblatt-Vorlage.xlsx',
    'Zuschlagskriterien-Matrix.xlsx',
  ],
  Organigramm: [
    'Organigramm-Verwaltung.pdf',
    'Zustaendigkeiten-Aemter.pdf',
    'Vertretungsregelung.pdf',
    'Ansprechpartner-Liste.pdf',
  ],
};

export function knowledgeBaseFileCount(name: string) {
  return (KNOWLEDGE_BASE_FILES[name] ?? []).length;
}

export const availableKnowledgeBases: ProjectKnowledgeBase[] = [
  { id: 'pk1', name: 'Satzungen & Gebühren', documentCount: 8 },
  { id: 'pk2', name: 'Dienstvereinbarungen', documentCount: 34 },
  { id: 'pk3', name: 'Stellenprofile', documentCount: 18 },
  { id: 'pk4', name: 'Vergaberecht', documentCount: 41 },
  { id: 'pk5', name: 'Organigramm', documentCount: 3 },
];
