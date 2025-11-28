import { Pencil, Search, FileText, Eye, HelpCircle, type LucideIcon } from 'lucide-react';

export interface QuickActionPrompt {
  labelKey: string;
  contentKey: string;
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
        contentKey: 'prompts.writing.draftDocumentContent',
      },
      {
        labelKey: 'prompts.writing.createDraft',
        contentKey: 'prompts.writing.createDraftContent',
      },
      {
        labelKey: 'prompts.writing.formulateResponse',
        contentKey: 'prompts.writing.formulateResponseContent',
      },
      {
        labelKey: 'prompts.writing.writeText',
        contentKey: 'prompts.writing.writeTextContent',
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
        contentKey: 'prompts.research.explainBasicsContent',
      },
      {
        labelKey: 'prompts.research.whatToConsider',
        contentKey: 'prompts.research.whatToConsiderContent',
      },
      {
        labelKey: 'prompts.research.findInformation',
        contentKey: 'prompts.research.findInformationContent',
      },
      {
        labelKey: 'prompts.research.helpFind',
        contentKey: 'prompts.research.helpFindContent',
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
        contentKey: 'prompts.summarize.summarizeTextContent',
      },
      {
        labelKey: 'prompts.summarize.extractKeyPoints',
        contentKey: 'prompts.summarize.extractKeyPointsContent',
      },
      {
        labelKey: 'prompts.summarize.createOverview',
        contentKey: 'prompts.summarize.createOverviewContent',
      },
      {
        labelKey: 'prompts.summarize.coreStatements',
        contentKey: 'prompts.summarize.coreStatementsContent',
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
        contentKey: 'prompts.analyze.checkTextContent',
      },
      {
        labelKey: 'prompts.analyze.analyzeDocument',
        contentKey: 'prompts.analyze.analyzeDocumentContent',
      },
      {
        labelKey: 'prompts.analyze.evaluateProposal',
        contentKey: 'prompts.analyze.evaluateProposalContent',
      },
      {
        labelKey: 'prompts.analyze.strengthsWeaknesses',
        contentKey: 'prompts.analyze.strengthsWeaknessesContent',
      },
    ],
  },
  {
    id: 'help',
    labelKey: 'categories.help',
    icon: HelpCircle,
    prompts: [
      {
        labelKey: 'prompts.help.gettingStarted',
        contentKey: 'prompts.help.gettingStartedContent',
      },
      {
        labelKey: 'prompts.help.createAgent',
        contentKey: 'prompts.help.createAgentContent',
      },
      {
        labelKey: 'prompts.help.availableTools',
        contentKey: 'prompts.help.availableToolsContent',
      },
      {
        labelKey: 'prompts.help.uploadSources',
        contentKey: 'prompts.help.uploadSourcesContent',
      },
      {
        labelKey: 'prompts.help.savePrompts',
        contentKey: 'prompts.help.savePromptsContent',
      },
      {
        labelKey: 'prompts.help.chooseModel',
        contentKey: 'prompts.help.chooseModelContent',
      },
    ],
  },
];
