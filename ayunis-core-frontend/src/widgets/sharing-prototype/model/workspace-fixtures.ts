import type { PrototypeWorkspace, SidebarChat } from './types';

function chats(prefix: string, titles: string[]): SidebarChat[] {
  return titles.map((title, index) => ({ id: `${prefix}-${index}`, title }));
}

export const WORKSPACES: PrototypeWorkspace[] = [
  {
    id: 'haushalt-2027',
    name: 'Haushalt 2027',
    description:
      'Aufstellung des Haushalts 2027 mit Kämmerei, Fachämtern und Hauptamt.',
    icon: 'euro',
    color: 'amber',
    ownerId: 'tobias',
    members: [
      { personId: 'lena', access: 'edit' },
      { personId: 'petra', access: 'manage' },
      { personId: 'sabine', access: 'use' },
    ],
    linkedSkills: [
      { skillId: 'haushaltsansaetze', linkedBy: 'tobias' },
      { skillId: 'datenschutz', linkedBy: 'tobias' },
      { skillId: 'tabellen', linkedBy: 'tobias' },
      { skillId: 'mail-antworten', linkedBy: 'lena' },
    ],
    chats: chats('haushalt', [
      'Eckdaten für die Einbringungsrede',
      'Ansatz Gebäudeunterhaltung begründen',
      'Rückfragen aus dem Bauamt sammeln',
      'Stellenplan 2027 erläutern',
    ]),
    artifacts: [
      {
        id: 'a1',
        title: 'Entwurf Haushaltsrede',
        kind: 'Dokument',
        updatedAt: 'Heute, 09:12',
      },
      {
        id: 'a2',
        title: 'Übersicht Investitionen 2027',
        kind: 'Tabelle',
        updatedAt: 'Gestern',
      },
      {
        id: 'a3',
        title: 'Zeitplan Haushaltsberatung',
        kind: 'Diagramm',
        updatedAt: '28.09.2026',
      },
    ],
    knowledgeBases: ['Haushaltssatzung 2026', 'Eckwertebeschluss 2027'],
    instructions:
      'Antworte im Ton der Kämmerei: sachlich, mit Zahlen belegt und für Ratsmitglieder verständlich. Beträge immer in Euro mit Tausenderpunkten.',
  },
  {
    id: 'bauleitplanung-nord',
    name: 'Bauleitplanung Nord',
    description:
      'Bebauungsplan Nr. 47 „Am Mühlbach“ von der Beteiligung bis zum Satzungsbeschluss.',
    icon: 'hammer',
    color: 'green',
    ownerId: 'jonas',
    members: [],
    teamGrants: [
      { teamId: 'bauamt', access: 'use', overrides: { lena: 'edit' } },
    ],
    linkedSkills: [
      { skillId: 'bebauungsplan', linkedBy: 'jonas' },
      { skillId: 'einfache-sprache', linkedBy: 'lena' },
    ],
    chats: chats('bauleitplanung', [
      'Stellungnahmen der Behörden ordnen',
      'Bekanntmachung Offenlage',
    ]),
    artifacts: [
      {
        id: 'b1',
        title: 'Abwägungstabelle Entwurf',
        kind: 'Tabelle',
        updatedAt: 'Heute, 11:40',
      },
    ],
    knowledgeBases: ['Baugesetzbuch', 'Flächennutzungsplan'],
    instructions:
      'Halte dich an die Begriffe des Baugesetzbuchs und nenne bei Fristen immer das genaue Datum.',
  },
  {
    id: 'gemeinderat-oktober',
    name: 'Gemeinderat Oktober',
    description:
      'Vorbereitung der Gemeinderatssitzung am 22. Oktober mit allen Ämtern.',
    icon: 'calendar',
    color: 'violet',
    ownerId: 'sabine',
    isOrgVisible: true,
    members: [
      { personId: 'tobias', access: 'edit' },
      { personId: 'jonas', access: 'use' },
    ],
    linkedSkills: [
      { skillId: 'ratsvorlage', linkedBy: 'sabine' },
      { skillId: 'pressemitteilung', linkedBy: 'sabine' },
    ],
    chats: chats('gemeinderat', [
      'Tagesordnung abstimmen',
      'Vorlage Radwegenetz kürzen',
    ]),
    artifacts: [],
    knowledgeBases: ['Geschäftsordnung Gemeinderat'],
    instructions:
      'Formuliere Vorlagen nach dem Muster der Geschäftsordnung mit Sachverhalt, Begründung und Beschlussvorschlag.',
  },
  {
    id: 'digitaler-buergerservice',
    name: 'Digitaler Bürgerservice',
    description:
      'Neue Online-Termine und Antworten auf häufige Fragen im Bürgerbüro.',
    icon: 'store',
    color: 'blue',
    ownerId: 'aylin',
    members: [{ personId: 'sabine', access: 'use' }],
    linkedSkills: [
      { skillId: 'terminanfragen', linkedBy: 'aylin' },
      { skillId: 'einfache-sprache', linkedBy: 'aylin' },
    ],
    chats: chats('buergerservice', ['Häufige Fragen Personalausweis']),
    artifacts: [],
    knowledgeBases: ['Leistungskatalog Bürgerbüro'],
    instructions:
      'Schreibe freundlich und in einfacher Sprache. Verweise auf die Online-Terminbuchung.',
  },
  {
    id: 'mobilitaetskonzept',
    name: 'Mobilitätskonzept 2030',
    description:
      'Radwege, Busanbindung und Parkraum für die Innenstadt bis 2030 planen.',
    icon: 'bike',
    color: 'teal',
    ownerId: 'lena',
    members: [
      { personId: 'jonas', access: 'edit' },
      { personId: 'markus', access: 'use' },
    ],
    linkedSkills: [
      { skillId: 'einfache-sprache', linkedBy: 'lena' },
      { skillId: 'pressemitteilung', linkedBy: 'lena' },
    ],
    chats: chats('mobilitaet', [
      'Ergebnisse der Bürgerbefragung',
      'Varianten Busringlinie vergleichen',
    ]),
    artifacts: [],
    knowledgeBases: ['Verkehrszählung 2025'],
    instructions:
      'Stelle Varianten immer mit Kosten, Zeitplan und Auswirkungen auf Anwohnende gegenüber.',
  },
  {
    id: 'digitale-bauantraege',
    name: 'Digitale Bauanträge',
    description:
      'Einführung des digitalen Bauantrags mit Checklisten und Mustertexten.',
    icon: 'filecheck',
    color: 'rose',
    ownerId: 'lena',
    members: [{ personId: 'jonas', access: 'use' }],
    linkedSkills: [
      { skillId: 'bauantrag', linkedBy: 'lena' },
      { skillId: 'mail-antworten', linkedBy: 'lena' },
    ],
    chats: chats('bauantraege', ['Checkliste Vollständigkeit']),
    artifacts: [],
    knowledgeBases: ['Landesbauordnung'],
    instructions:
      'Nenne bei fehlenden Unterlagen immer die genaue Vorschrift der Landesbauordnung.',
  },
  {
    id: 'jahresabschluss-2025',
    name: 'Jahresabschluss 2025',
    description:
      'Jahresabschluss 2025 mit Rechenschaftsbericht und Anlagen erstellen.',
    icon: 'calculator',
    color: 'blue',
    ownerId: 'tobias',
    members: [
      { personId: 'petra', access: 'edit' },
      { personId: 'sabine', access: 'use' },
    ],
    linkedSkills: [{ skillId: 'tabellen', linkedBy: 'tobias' }],
    chats: chats('jahresabschluss', ['Abweichungen zum Plan erklären']),
    artifacts: [],
    knowledgeBases: ['Haushaltssatzung 2025'],
    instructions:
      'Begründe Abweichungen über 5 Prozent einzeln und mit Verweis auf die Haushaltsstelle.',
  },
  {
    id: 'sanierung-grundschule',
    name: 'Sanierung Grundschule',
    description:
      'Sanierung der Grundschule am Lindenplatz von der Ausschreibung bis zur Abnahme.',
    icon: 'school',
    color: 'amber',
    ownerId: 'jonas',
    members: [
      { personId: 'tobias', access: 'use' },
      { personId: 'lena', access: 'use' },
    ],
    linkedSkills: [
      { skillId: 'baustelleninfo', linkedBy: 'jonas' },
      { skillId: 'pressemitteilung', linkedBy: 'jonas' },
    ],
    chats: chats('grundschule', [
      'Bauzeitenplan mit der Schulleitung abstimmen',
    ]),
    artifacts: [],
    knowledgeBases: ['Vergabeordnung'],
    instructions:
      'Informiere Eltern und Schulleitung früh und in einfacher Sprache über Einschränkungen.',
  },
  {
    id: 'personalentwicklung',
    name: 'Personalentwicklung',
    description:
      'Fortbildungen, Mitarbeitergespräche und Einarbeitung neuer Kolleginnen und Kollegen.',
    icon: 'users',
    color: 'violet',
    ownerId: 'sabine',
    members: [{ personId: 'aylin', access: 'edit' }],
    linkedSkills: [
      { skillId: 'sitzungstermine', linkedBy: 'sabine' },
      { skillId: 'datenschutz', linkedBy: 'sabine' },
    ],
    chats: chats('personal', ['Einarbeitungsplan Bürgerbüro']),
    artifacts: [],
    knowledgeBases: ['Dienstvereinbarung Fortbildung'],
    instructions:
      'Formuliere wertschätzend und halte dich an die Dienstvereinbarung.',
  },
];

export const FAVORITE_WORKSPACE_ID = 'haushalt-2027';
