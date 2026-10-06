import { SHARED_SKILLS } from './shared-skill-fixtures';
import type { Person, PrototypeSkill, Role, Team } from './types';

export const ORG = {
  name: 'Stadtverwaltung Musterstadt',
  memberCount: 186,
};

export const TEAMS: Team[] = [
  { id: 'hauptamt', name: 'Hauptamt', memberCount: 8, adminIds: ['sabine'] },
  { id: 'bauamt', name: 'Bauamt', memberCount: 14, adminIds: ['jonas'] },
  { id: 'kaemmerei', name: 'Kämmerei', memberCount: 9, adminIds: ['petra'] },
  {
    id: 'buergerservice',
    name: 'Bürgerservice',
    memberCount: 34,
    adminIds: ['aylin', 'jonas'],
  },
];

export const PEOPLE: Person[] = [
  {
    id: 'sabine',
    name: 'Sabine Keller',
    department: 'Hauptamt',
    email: 'sabine.keller@musterstadt.de',
    teamIds: ['hauptamt'],
  },
  {
    id: 'jonas',
    name: 'Jonas Weber',
    department: 'Bauamt',
    email: 'jonas.weber@musterstadt.de',
    teamIds: ['bauamt', 'buergerservice'],
  },
  {
    id: 'lena',
    name: 'Lena Hoffmann',
    department: 'Bauamt',
    email: 'lena.hoffmann@musterstadt.de',
    teamIds: ['bauamt', 'buergerservice', 'hauptamt'],
  },
  {
    id: 'tobias',
    name: 'Tobias Brandt',
    department: 'Kämmerei',
    email: 'tobias.brandt@musterstadt.de',
    teamIds: ['kaemmerei'],
  },
  {
    id: 'petra',
    name: 'Petra Schulz',
    department: 'Kämmerei',
    email: 'petra.schulz@musterstadt.de',
    teamIds: ['kaemmerei'],
  },
  {
    id: 'aylin',
    name: 'Aylin Demir',
    department: 'Bürgerservice',
    email: 'aylin.demir@musterstadt.de',
    teamIds: ['buergerservice'],
  },
  {
    id: 'markus',
    name: 'Markus Klein',
    department: 'Bauamt',
    email: 'markus.klein@musterstadt.de',
    teamIds: ['bauamt'],
  },
  {
    id: 'nina',
    name: 'Nina Vogt',
    department: 'Bürgerservice',
    email: 'nina.vogt@musterstadt.de',
    teamIds: ['buergerservice'],
  },
];

export const ROLE_PERSON: Record<Role, string> = {
  orgAdmin: 'sabine',
  teamAdmin: 'jonas',
  member: 'lena',
  workspaceOwner: 'tobias',
};

export const WORKSPACE_ACCESS_LABEL = {
  owner: 'Eigentümer',
  manage: 'Vollzugriff',
  edit: 'Kann bearbeiten',
  use: 'Kann verwenden',
} as const;

export const WORKSPACE_ACCESS_DESCRIPTION = {
  manage:
    'Fähigkeiten, Wissen und Anweisungen anpassen, Personen einladen und Rechte vergeben.',
  edit: 'Fähigkeiten, Wissen und Anweisungen anpassen.',
  use: 'Im Arbeitsbereich chatten und Inhalte erstellen.',
} as const;

export const VIEWER_WORKSPACE_ACCESS_LABEL = {
  owner: 'Ihr Arbeitsbereich',
  manage: 'Sie haben Vollzugriff',
  edit: 'Sie können bearbeiten',
  use: 'Sie können verwenden',
} as const;

export const ROLE_LABEL: Record<Role, string> = {
  orgAdmin: 'Admin',
  teamAdmin: 'Team-Admin',
  member: 'Mitarbeitende',
  workspaceOwner: 'Arbeitsbereich-Eigentümer',
};

export const SKILLS: PrototypeSkill[] = [
  {
    id: 'abnahmeprotokoll',
    name: 'Abnahmeprotokolle vorbereiten',
    shortDescription:
      'Bereitet Protokolle für Bauabnahmen mit Mängelliste und Fristen vor.',
    owner: { kind: 'user', userId: 'markus' },
  },
  {
    id: 'meldebescheinigung',
    name: 'Fragen zur Meldebescheinigung beantworten',
    shortDescription:
      'Erklärt, wie man eine Meldebescheinigung bekommt und was sie kostet.',
    owner: { kind: 'user', userId: 'nina' },
  },
  {
    id: 'einfache-sprache',
    name: 'Bürgerbriefe in einfacher Sprache',
    shortDescription:
      'Formuliert Schreiben an Bürgerinnen und Bürger verständlich und freundlich.',
    owner: { kind: 'org' },
  },
  {
    id: 'datenschutz',
    name: 'Datenschutz-Check',
    shortDescription:
      'Prüft Texte auf personenbezogene Daten, bevor sie die Verwaltung verlassen.',
    owner: { kind: 'org' },
  },
  {
    id: 'ratsvorlage',
    name: 'Gemeinderatsvorlage erstellen',
    shortDescription:
      'Bringt Beschlussvorlagen in die einheitliche Form der Verwaltung.',
    owner: { kind: 'org' },
  },
  {
    id: 'pressemitteilung',
    name: 'Pressemitteilung schreiben',
    shortDescription:
      'Erstellt Pressemitteilungen im Stil der Pressestelle mit Zitatvorschlag.',
    owner: { kind: 'org' },
  },
  {
    id: 'bauantrag',
    name: 'Bauantrag vorprüfen',
    shortDescription:
      'Prüft eingereichte Bauanträge auf Vollständigkeit und fehlende Unterlagen.',
    owner: { kind: 'team', teamId: 'bauamt' },
  },
  {
    id: 'bebauungsplan',
    name: 'Stellungnahme zum Bebauungsplan',
    shortDescription:
      'Entwirft Stellungnahmen zu Bebauungsplänen nach den Vorgaben des Bauamts.',
    owner: { kind: 'team', teamId: 'bauamt' },
  },
  {
    id: 'haushaltsansaetze',
    name: 'Haushaltsansätze erläutern',
    shortDescription:
      'Erklärt Haushaltsansätze verständlich für Ausschüsse und Gemeinderat.',
    owner: { kind: 'team', teamId: 'kaemmerei' },
  },
  {
    id: 'terminanfragen',
    name: 'Terminanfragen beantworten',
    shortDescription:
      'Beantwortet Terminanfragen im Bürgerservice mit freien Zeitfenstern.',
    owner: { kind: 'team', teamId: 'buergerservice' },
  },
  {
    id: 'protokoll',
    name: 'Besprechungsprotokoll zusammenfassen',
    shortDescription:
      'Fasst Besprechungsnotizen zu Ergebnissen und offenen Aufgaben zusammen.',
    owner: { kind: 'user', userId: 'lena' },
  },
  {
    id: 'mail-antworten',
    name: 'E-Mail-Antworten formulieren',
    shortDescription:
      'Schlägt höfliche Antworten auf Anfragen von Bauherrinnen und Bauherren vor.',
    owner: { kind: 'user', userId: 'lena' },
  },
  {
    id: 'baustelleninfo',
    name: 'Baustelleninfos für Anwohnende',
    shortDescription:
      'Schreibt kurze Informationen zu Baustellen, Sperrungen und Umleitungen.',
    owner: { kind: 'user', userId: 'jonas' },
  },
  {
    id: 'tabellen',
    name: 'Tabellen auf Fehler prüfen',
    shortDescription:
      'Findet Summenfehler, Lücken und Ausreißer in Tabellen der Kämmerei.',
    owner: { kind: 'user', userId: 'tobias' },
  },
  {
    id: 'foerderantraege',
    name: 'Förderanträge gegenlesen',
    shortDescription:
      'Prüft Förderanträge auf Fristen, Pflichtangaben und Formfehler.',
    owner: { kind: 'team', teamId: 'kaemmerei' },
    submittedBy: 'tobias',
  },
  {
    id: 'sitzungstermine',
    name: 'Sitzungstermine koordinieren',
    shortDescription:
      'Sammelt Terminvorschläge und erstellt Einladungen für Sitzungen.',
    owner: { kind: 'user', userId: 'sabine' },
  },
  {
    id: 'sitzungsunterlagen',
    name: 'Sitzungsunterlagen Finanzausschuss',
    shortDescription:
      'Stellt Tischvorlagen und Sachstandsberichte für den Finanzausschuss zusammen.',
    owner: { kind: 'workspace', workspaceId: 'haushalt-2027' },
  },
  {
    id: 'abwaegung',
    name: 'Abwägungstabelle erstellen',
    shortDescription:
      'Ordnet Stellungnahmen aus der Beteiligung und schlägt Abwägungen vor.',
    owner: { kind: 'workspace', workspaceId: 'bauleitplanung-nord' },
  },
  {
    id: 'haushaltsrede',
    name: 'Haushaltsrede entwerfen',
    shortDescription:
      'Entwirft die Rede zur Einbringung des Haushalts auf Basis der Eckdaten.',
    owner: { kind: 'workspace', workspaceId: 'haushalt-2027' },
  },
  ...SHARED_SKILLS,
];
