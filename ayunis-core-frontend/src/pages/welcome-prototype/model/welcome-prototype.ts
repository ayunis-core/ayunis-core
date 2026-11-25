import type {
  ModelProviderInfoResponseDtoProvider,
  ModelWithConfigResponseDtoTier,
} from '@ayunis/api-client/schemas';

export type WelcomeRole = 'admin' | 'user';

export type WelcomeGradient = 'product' | 'mist';

export const WELCOME_GRADIENTS: ReadonlyArray<{
  value: WelcomeGradient;
  label: string;
}> = [
  { value: 'product', label: 'Produkt' },
  { value: 'mist', label: 'Nebel' },
];

export type WelcomePhase = 'intro' | 'leaving' | 'step';

export type WelcomeStage =
  | 'chapterSetup'
  | 'models'
  | 'mode'
  | 'appearance'
  | 'settings'
  | 'tone'
  | 'chapterKnow'
  | 'chat'
  | 'chapterDiscover'
  | 'skills'
  | 'routine'
  | 'overview'
  | 'finale';

export const ROLE_STAGES: Record<WelcomeRole, WelcomeStage[]> = {
  admin: [
    'chapterSetup',
    'models',
    'mode',
    'appearance',
    'settings',
    'tone',
    'chapterKnow',
    'chat',
    'chapterDiscover',
    'skills',
    'routine',
    'overview',
    'finale',
  ],
  user: [
    'appearance',
    'chapterKnow',
    'chat',
    'chapterDiscover',
    'skills',
    'routine',
    'finale',
  ],
};

const STAGE_LABELS: Record<WelcomeStage, string> = {
  chapterSetup: 'Einrichten',
  models: 'Modelle',
  mode: 'Modus',
  appearance: 'Darstellung',
  settings: 'Einstellungen',
  tone: 'Ansprache',
  chapterKnow: 'Kennenlernen',
  chat: 'Chat',
  chapterDiscover: 'Entdecken',
  skills: 'Fähigkeiten',
  routine: 'Routine',
  overview: 'Überblick',
  finale: 'Loslegen',
};

export type WelcomeJump = 'intro' | WelcomeStage;

export function jumpOptions(
  role: WelcomeRole,
): ReadonlyArray<{ value: WelcomeJump; label: string }> {
  return [
    { value: 'intro', label: 'Begrüßung' },
    ...ROLE_STAGES[role].map((stage) => ({
      value: stage,
      label: STAGE_LABELS[stage],
    })),
  ];
}

export const WELCOME_PERSON = {
  firstName: 'Anna',
  fullName: 'Anna Berger',
  department: 'Bauamt / Stadtplanung',
  orgName: 'Gemeinde Herzebrock-Clarholz',
};

export interface PrototypeModel {
  name: string;
  provider: ModelProviderInfoResponseDtoProvider;
}

export interface ModelTier {
  label: string;
  tier: ModelWithConfigResponseDtoTier;
  models: PrototypeModel[];
}

export const MODEL_TIERS: ModelTier[] = [
  {
    label: 'Leistungsstark',
    tier: 'high',
    models: [
      { name: 'Claude Opus 5.5', provider: 'bedrock' },
      { name: 'GPT 6 Astra', provider: 'azure' },
      { name: 'GPT 6.1 Sol', provider: 'azure' },
      { name: 'Mistral Large 4', provider: 'mistral' },
    ],
  },
  {
    label: 'Ausgewogen',
    tier: 'medium',
    models: [
      { name: 'Claude Sonnet 5', provider: 'bedrock' },
      { name: 'GPT 6 Luna', provider: 'azure' },
      { name: 'GPT 6.1 Terra', provider: 'azure' },
      { name: 'Mistral Medium', provider: 'mistral' },
    ],
  },
  {
    label: 'Schwach',
    tier: 'low',
    models: [
      { name: 'Claude Haiku 4.5', provider: 'bedrock' },
      { name: 'GPT OSS', provider: 'stackit' },
      { name: 'Qwen 3', provider: 'stackit' },
    ],
  },
];

export interface SkillSuggestion {
  name: string;
  description: string;
}

export const MARKETPLACE_SKILLS: SkillSuggestion[] = [
  {
    name: 'Bürgeranfragen beantworten',
    description: 'Verständliche Antworten im Ton Ihrer Verwaltung',
  },
  {
    name: 'Stellungnahmen zusammenfassen',
    description: 'Bündelt Stellungnahmen nach Themen',
  },
  {
    name: 'Sitzungsvorlagen erstellen',
    description: 'Entwürfe für Rat und Ausschüsse',
  },
];

export const ORG_INSTRUCTION: Record<string, string> = {
  formal:
    'Wir sind die Gemeinde Herzebrock-Clarholz. Antworten an Bürgerinnen und Bürger sind förmlich, sachlich und nennen die rechtliche Grundlage.',
  friendly:
    'Wir sind die Gemeinde Herzebrock-Clarholz. Antworten an Bürgerinnen und Bürger sind freundlich, in klarer Sprache und ohne Fachbegriffe.',
  short:
    'Wir sind die Gemeinde Herzebrock-Clarholz. Antworten an Bürgerinnen und Bürger sind kurz, direkt und nennen den nächsten Schritt.',
};
