export type PanelKey = 'context' | 'results';

export type EntryVariant = 'single' | 'menu' | 'header';

export type AvailabilityVariant = 'row' | 'split' | 'dropdowns' | 'underInput';

export interface PrototypeState {
  view: 'new' | 'chat';
  scope: 'chat' | 'project';
  pendingIds: string[];
  contextIds: string[];
  processingIds: string[];
  artifactIds: string[];
  transcriptIds: string[];
  panel: PanelKey | null;
  openArtifactId: string | null;
  openSourceId: string | null;
  openContextId: string | null;
  sourceListIds: string[] | null;
  highlight: PanelKey | null;
}

export interface JourneyStep {
  id: string;
  label: string;
  hint: string;
  state: PrototypeState;
}

const EMPTY: PrototypeState = {
  view: 'chat',
  scope: 'chat',
  pendingIds: [],
  contextIds: [],
  processingIds: [],
  artifactIds: [],
  transcriptIds: [],
  panel: null,
  openArtifactId: null,
  openSourceId: null,
  openContextId: null,
  sourceListIds: null,
  highlight: null,
};

const ARCHIVED_STEPS: JourneyStep[] = [
  {
    id: 'neuer-chat',
    label: 'Neuer Chat',
    hint: 'Vor der ersten Frage gibt es weder Kontext noch Ergebnisse — der Seitenbereich existiert noch gar nicht.',
    state: { ...EMPTY, view: 'new' },
  },
  {
    id: 'start',
    label: 'Neuer Chat',
    hint: 'Wissensdatenbanken aus dem Wissen-Reiter sind immer dabei. Der Chat zeigt das an, entscheidet es aber nicht.',
    state: { ...EMPTY, contextIds: ['kb-bauleitplanung'] },
  },
  {
    id: 'datei',
    label: 'Datei hochladen',
    hint: 'Was nur diesen Chat betrifft, liegt zunächst im Eingabefeld.',
    state: {
      ...EMPTY,
      contextIds: ['kb-bauleitplanung'],
      pendingIds: ['file-stellplatzsatzung'],
    },
  },
  {
    id: 'faehigkeit',
    label: 'Fähigkeit wählen',
    hint: 'Zwei Anhänge, und das Eingabefeld wird eng. Genau hier bricht die heutige Lösung.',
    state: {
      ...EMPTY,
      contextIds: ['kb-bauleitplanung'],
      pendingIds: ['file-stellplatzsatzung', 'skill-ratsvorlage'],
    },
  },
  {
    id: 'gesendet',
    label: 'Abgeschickt',
    hint: 'Das Eingabefeld ist wieder leer, die Anhänge stehen ab jetzt im Kontext.',
    state: {
      ...EMPTY,
      contextIds: [
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
        'skill-ratsvorlage',
      ],
      transcriptIds: ['msg-frage', 'msg-antwort-1'],
      highlight: 'context',
    },
  },
  {
    id: 'selbstaktivierung',
    label: 'Ayunis Core aktiviert selbst',
    hint: 'Der Verlauf sagt es an, die Fähigkeit steht danach im Kontext. Das ist die Lücke, die Codex offen lässt.',
    state: {
      ...EMPTY,
      contextIds: [
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
        'skill-ratsvorlage',
        'skill-aktenzeichen',
      ],
      transcriptIds: [
        'msg-frage',
        'msg-antwort-1',
        'entry-aktivierung',
        'msg-antwort-2',
      ],
      highlight: 'context',
    },
  },
  {
    id: 'ergebnis',
    label: 'Ergebnis entsteht',
    hint: 'Das Ergebnis steht im Verlauf und ab sofort dauerhaft oben rechts.',
    state: {
      ...EMPTY,
      contextIds: [
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
        'skill-ratsvorlage',
        'skill-aktenzeichen',
        'integration-ris',
      ],
      artifactIds: ['artifact-vorlage'],
      transcriptIds: [
        'msg-frage',
        'msg-antwort-1',
        'entry-aktivierung',
        'msg-antwort-2',
        'entry-artefakt',
      ],
      highlight: 'results',
    },
  },
  {
    id: 'kontext',
    label: 'Kontext prüfen',
    hint: 'Fähigkeiten zuerst — sie verändern das Verhalten. Wissen darunter, mit Herkunft. Nichts davon wird hier verwaltet.',
    state: {
      ...EMPTY,
      contextIds: [
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
        'skill-ratsvorlage',
        'skill-aktenzeichen',
        'integration-ris',
      ],
      artifactIds: ['artifact-vorlage'],
      transcriptIds: [
        'msg-frage',
        'msg-antwort-1',
        'entry-aktivierung',
        'msg-antwort-2',
        'entry-artefakt',
      ],
      panel: 'context',
    },
  },
  {
    id: 'quelle',
    label: 'Quelle nachschlagen',
    hint: 'Die Belege unter der Antwort sind die tatsächlichen Treffer der Werkzeuge — Klick zeigt die Textstelle, nicht nur den Dateinamen.',
    state: {
      ...EMPTY,
      contextIds: [
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
        'skill-ratsvorlage',
        'skill-aktenzeichen',
        'integration-ris',
      ],
      artifactIds: ['artifact-vorlage'],
      transcriptIds: [
        'msg-frage',
        'msg-antwort-1',
        'entry-aktivierung',
        'msg-antwort-2',
        'entry-artefakt',
      ],
      panel: 'context',
      openSourceId: 'hit-satzung',
    },
  },
  {
    id: 'quelle-web',
    label: 'Quelle aus dem Internet',
    hint: 'Websuche liefert Titel, Adresse und Textausschnitt mit — dieselbe Ansicht, nur mit Link statt Seitenzahl.',
    state: {
      ...EMPTY,
      contextIds: [
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
        'skill-ratsvorlage',
        'skill-aktenzeichen',
        'integration-ris',
      ],
      artifactIds: ['artifact-vorlage'],
      transcriptIds: [
        'msg-frage',
        'msg-antwort-1',
        'entry-aktivierung',
        'msg-antwort-2',
        'entry-artefakt',
      ],
      panel: 'context',
      openSourceId: 'hit-baunvo',
    },
  },
  {
    id: 'dokument-verarbeitung',
    label: 'Dokument hinzufügen',
    hint: 'Die Datei steht sofort im Kontext — noch nicht nutzbar, aber schon sichtbar.',
    state: {
      ...EMPTY,
      contextIds: [
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
        'file-verkehrszaehlung',
        'skill-ratsvorlage',
        'skill-aktenzeichen',
      ],
      processingIds: ['file-verkehrszaehlung'],
      artifactIds: ['artifact-vorlage'],
      transcriptIds: [
        'msg-frage',
        'msg-antwort-1',
        'entry-aktivierung',
        'msg-antwort-2',
        'entry-artefakt',
      ],
      panel: 'context',
      highlight: 'context',
    },
  },
  {
    id: 'dokument-bereit',
    label: 'Dokument ist bereit',
    hint: 'Fertig verarbeitet, ab jetzt durchsuchbar.',
    state: {
      ...EMPTY,
      contextIds: [
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
        'file-verkehrszaehlung',
        'skill-ratsvorlage',
        'skill-aktenzeichen',
        'integration-ris',
      ],
      artifactIds: ['artifact-vorlage'],
      transcriptIds: [
        'msg-frage',
        'msg-antwort-1',
        'entry-aktivierung',
        'msg-antwort-2',
        'entry-artefakt',
      ],
      panel: 'context',
    },
  },
  {
    id: 'ergebnisse',
    label: 'Ergebnisse öffnen',
    hint: 'Alles Erstellte an einer Stelle — kein Scrollen durch den Verlauf mehr.',
    state: {
      ...EMPTY,
      contextIds: [
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
        'skill-ratsvorlage',
        'skill-aktenzeichen',
      ],
      artifactIds: ['artifact-vorlage', 'artifact-fristen'],
      transcriptIds: [
        'msg-frage',
        'msg-antwort-1',
        'entry-aktivierung',
        'msg-antwort-2',
        'entry-artefakt',
      ],
      panel: 'results',
    },
  },
  {
    id: 'projekt',
    label: 'Derselbe Chat im Projekt',
    hint: 'Gleiche Bedienung, gleiche Reihenfolge. Was aus dem Projekt kommt, ist an der Zeile erkennbar.',
    state: {
      ...EMPTY,
      scope: 'project',
      contextIds: [
        'skill-projekt',
        'skill-ratsvorlage',
        'skill-aktenzeichen',
        'kb-projekt',
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
      ],
      artifactIds: ['artifact-vorlage', 'artifact-fristen'],
      transcriptIds: [
        'msg-frage',
        'msg-antwort-1',
        'entry-aktivierung',
        'msg-antwort-2',
        'entry-artefakt',
      ],
      panel: 'context',
    },
  },
  {
    id: 'dokumente-projekt',
    label: 'Weitere Dokumente im Projekt-Chat',
    hint: 'Hochgeladene Dateien bleiben in diesem Chat. Ins Projekt kommen sie nur über den Projekt-Reiter — die Zeile sagt, was wohin gehört.',
    state: {
      ...EMPTY,
      scope: 'project',
      contextIds: [
        'skill-projekt',
        'skill-ratsvorlage',
        'skill-aktenzeichen',
        'kb-projekt',
        'kb-bauleitplanung',
        'file-stellplatzsatzung',
        'file-verkehrszaehlung',
        'file-radverkehr',
      ],
      artifactIds: ['artifact-vorlage', 'artifact-fristen'],
      transcriptIds: [
        'msg-frage',
        'msg-antwort-1',
        'entry-aktivierung',
        'msg-antwort-2',
        'entry-artefakt',
      ],
      panel: 'context',
    },
  },
];

export const ARCHIVE = ARCHIVED_STEPS;

export const JOURNEY: JourneyStep[] = [
  {
    id: 'startseite',
    label: 'Startseite',
    hint: 'Vor der ersten Nachricht: Womit kann Ayunis Core überhaupt arbeiten? Varianten unten umschaltbar.',
    state: { ...EMPTY, view: 'new' },
  },
  {
    id: 'presse-frage',
    label: 'Frage stellen',
    hint: 'Der Chat startet leer — weder Kontext noch Ergebnisse, der Seitenbereich ist zu.',
    state: {
      ...EMPTY,
      transcriptIds: ['msg-presse-frage'],
    },
  },
  {
    id: 'presse-aktivierung',
    label: 'Fähigkeit wird aktiviert',
    hint: 'Ayunis Core holt sich die passende Fähigkeit selbst und sagt es im Verlauf an.',
    state: {
      ...EMPTY,
      contextIds: ['skill-pressemitteilung'],
      transcriptIds: [
        'msg-presse-frage',
        'entry-presse-aktivierung',
        'msg-presse-antwort',
      ],
      highlight: 'context',
    },
  },
  {
    id: 'presse-ergebnis',
    label: 'Ergebnis entsteht',
    hint: 'Das Dokument öffnet sich rechts im Editor. Im Kontext steht jetzt auch die Wissensdatenbank, in der gesucht wurde.',
    state: {
      ...EMPTY,
      contextIds: ['skill-pressemitteilung', 'kb-presse'],
      artifactIds: ['artifact-pressemitteilung'],
      transcriptIds: [
        'msg-presse-frage',
        'entry-presse-aktivierung',
        'msg-presse-antwort',
        'entry-presse-artefakt',
      ],
      panel: 'results',
      openArtifactId: 'artifact-pressemitteilung',
    },
  },
  {
    id: 'presse-quellen',
    label: 'Viele Quellen',
    hint: 'Ab vier Belegen ein Sammel-Badge. Klick öffnet die Quellen, gruppiert nach Dokument statt nach Suchschritt.',
    state: {
      ...EMPTY,
      contextIds: ['skill-pressemitteilung', 'kb-presse'],
      artifactIds: ['artifact-pressemitteilung'],
      transcriptIds: [
        'msg-presse-frage',
        'entry-presse-aktivierung',
        'msg-presse-antwort-viele',
        'entry-presse-artefakt',
      ],
      panel: 'context',
      sourceListIds: [
        'hit-presse-vorlage',
        'hit-presse-vorlage-2',
        'hit-buergerbuero',
        'hit-oeffnungszeiten',
        'hit-barrierefreiheit',
      ],
    },
  },
];
