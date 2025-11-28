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
        content: 'Hilf mir, ein offizielles Schreiben zu verfassen',
      },
      {
        labelKey: 'prompts.writing.createDraft',
        content: 'Erstelle einen Entwurf für...',
      },
      {
        labelKey: 'prompts.writing.formulateResponse',
        content: 'Formuliere eine Antwort auf...',
      },
      {
        labelKey: 'prompts.writing.writeText',
        content: 'Schreibe einen Text über...',
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
        content: 'Erkläre mir die Grundlagen zu...',
      },
      {
        labelKey: 'prompts.research.whatToConsider',
        content: 'Was muss ich beachten bei...?',
      },
      {
        labelKey: 'prompts.research.findInformation',
        content: 'Welche Informationen gibt es zu...?',
      },
      {
        labelKey: 'prompts.research.helpFind',
        content: 'Hilf mir, Informationen zu finden über...',
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
        content: 'Fasse den folgenden Text zusammen',
      },
      {
        labelKey: 'prompts.summarize.extractKeyPoints',
        content: 'Extrahiere die wichtigsten Punkte',
      },
      {
        labelKey: 'prompts.summarize.createOverview',
        content: 'Erstelle eine Kurzübersicht',
      },
      {
        labelKey: 'prompts.summarize.coreStatements',
        content: 'Was sind die Kernaussagen?',
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
        content: 'Prüfe den folgenden Text',
      },
      {
        labelKey: 'prompts.analyze.analyzeDocument',
        content: 'Analysiere dieses Dokument',
      },
      {
        labelKey: 'prompts.analyze.evaluateProposal',
        content: 'Bewerte den folgenden Vorschlag',
      },
      {
        labelKey: 'prompts.analyze.strengthsWeaknesses',
        content: 'Welche Stärken und Schwächen siehst du?',
      },
    ],
  },
];
