import { Pencil, Search, FileText, Eye, type LucideIcon } from 'lucide-react';

export interface QuickActionPrompt {
  labelKey: string;
  content: string;
}

export interface QuickActionCategory {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  prompts: QuickActionPrompt[];
}

export const QUICK_ACTIONS: QuickActionCategory[] = [
  {
    id: 'writing',
    labelKey: 'categories.writing',
    icon: Pencil,
    prompts: [
      {
        labelKey: 'prompts.writing.draftDocument',
        content:
          'Könntest du mir helfen, ein offizielles Schreiben zu verfassen? Falls du weitere Informationen von mir brauchst, stelle mir direkt 1-2 wichtige Fragen. Wenn du meinst, dass ich Dokumente hochladen sollte, die dir bei der Aufgabe helfen würden, lass es mich wissen.',
      },
      {
        labelKey: 'prompts.writing.createDraft',
        content:
          'Ich brauche einen Entwurf für ein Dokument. Falls du weitere Informationen von mir brauchst, stelle mir direkt 1-2 wichtige Fragen. Bitte führe die Aufgabe so bald wie möglich aus.',
      },
      {
        labelKey: 'prompts.writing.formulateResponse',
        content:
          'Könntest du mir helfen, eine Antwort zu formulieren? Falls du weitere Informationen von mir brauchst, stelle mir direkt 1-2 wichtige Fragen. Wenn du meinst, dass ich Dokumente hochladen sollte (z.B. die ursprüngliche Nachricht), lass es mich wissen.',
      },
      {
        labelKey: 'prompts.writing.writeText',
        content:
          'Ich möchte einen Text schreiben. Falls du weitere Informationen von mir brauchst (Thema, Zielgruppe, Länge), stelle mir direkt 1-2 wichtige Fragen. Bitte führe die Aufgabe so bald wie möglich aus.',
      },
    ],
  },
  {
    id: 'research',
    labelKey: 'categories.research',
    icon: Search,
    prompts: [
      {
        labelKey: 'prompts.research.explainBasics',
        content:
          'Könntest du mir die Grundlagen zu einem Thema erklären? Falls du weitere Informationen von mir brauchst, stelle mir direkt 1-2 wichtige Fragen. Eine visuelle oder strukturierte Darstellung wäre toll, falls es sinnvoll ist.',
      },
      {
        labelKey: 'prompts.research.whatToConsider',
        content:
          'Ich möchte wissen, was ich bei einem bestimmten Thema beachten muss. Falls du weitere Informationen von mir brauchst, stelle mir direkt 1-2 wichtige Fragen. Überlege bei der Erstellung einer Darstellung, welche Art (Checkliste, Übersicht usw.) für diese Aufgabe am hilfreichsten sein könnte.',
      },
      {
        labelKey: 'prompts.research.findInformation',
        content:
          'Ich suche Informationen zu einem bestimmten Thema. Falls du weitere Informationen von mir brauchst, stelle mir direkt 1-2 wichtige Fragen. Bitte führe die Aufgabe so bald wie möglich aus.',
      },
      {
        labelKey: 'prompts.research.helpFind',
        content:
          'Könntest du mir helfen, Informationen zu finden? Falls du weitere Informationen von mir brauchst, stelle mir direkt 1-2 wichtige Fragen. Eine strukturierte Zusammenfassung wäre toll, falls es sinnvoll ist.',
      },
    ],
  },
  {
    id: 'summarize',
    labelKey: 'categories.summarize',
    icon: FileText,
    prompts: [
      {
        labelKey: 'prompts.summarize.summarizeText',
        content:
          'Könntest du einen Text für mich zusammenfassen? Wenn du meinst, dass ich Dokumente hochladen sollte, die dir bei der Aufgabe helfen würden, lass es mich wissen. Eine strukturierte Zusammenfassung mit Kernpunkten wäre ideal.',
      },
      {
        labelKey: 'prompts.summarize.extractKeyPoints',
        content:
          'Könntest du die wichtigsten Punkte aus einem Text extrahieren? Wenn du meinst, dass ich Dokumente hochladen sollte, lass es mich wissen. Eine Aufzählung der Kernaussagen wäre ideal.',
      },
      {
        labelKey: 'prompts.summarize.createOverview',
        content:
          'Ich brauche eine Kurzübersicht zu einem Thema oder Dokument. Falls du weitere Informationen von mir brauchst, stelle mir direkt 1-2 wichtige Fragen. Überlege, welche Darstellungsform (Tabelle, Liste, Absätze) am hilfreichsten wäre.',
      },
      {
        labelKey: 'prompts.summarize.coreStatements',
        content:
          'Könntest du die Kernaussagen eines Textes herausarbeiten? Wenn du meinst, dass ich Dokumente hochladen sollte, lass es mich wissen. Eine klare, strukturierte Aufbereitung wäre toll.',
      },
    ],
  },
  {
    id: 'analyze',
    labelKey: 'categories.analyze',
    icon: Eye,
    prompts: [
      {
        labelKey: 'prompts.analyze.checkText',
        content:
          'Könntest du einen Text für mich prüfen? Falls du weitere Informationen von mir brauchst (z.B. worauf ich besonders achten sollte), stelle mir direkt 1-2 wichtige Fragen. Wenn du meinst, dass ich Dokumente hochladen sollte, lass es mich wissen.',
      },
      {
        labelKey: 'prompts.analyze.analyzeDocument',
        content:
          'Könntest du ein Dokument für mich analysieren? Wenn du meinst, dass ich Dokumente hochladen sollte, lass es mich wissen. Eine strukturierte Analyse mit den wichtigsten Erkenntnissen wäre ideal.',
      },
      {
        labelKey: 'prompts.analyze.evaluateProposal',
        content:
          'Könntest du einen Vorschlag für mich bewerten? Falls du weitere Informationen von mir brauchst, stelle mir direkt 1-2 wichtige Fragen. Eine Darstellung mit Pro und Contra wäre hilfreich.',
      },
      {
        labelKey: 'prompts.analyze.strengthsWeaknesses',
        content:
          'Könntest du die Stärken und Schwächen von etwas analysieren? Falls du weitere Informationen von mir brauchst, stelle mir direkt 1-2 wichtige Fragen. Eine tabellarische oder strukturierte Gegenüberstellung wäre ideal.',
      },
    ],
  },
];
