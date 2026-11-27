import type {
  ModelProviderInfoResponseDtoProvider,
  ModelWithConfigResponseDtoTier,
} from '@ayunis/api-client/schemas';

import { CHAT_SCRIPT } from './chat-script';

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
  | 'capabilities'
  | 'starter'
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
    'capabilities',
    'starter',
    'finale',
  ],
  user: [
    'appearance',
    'chapterKnow',
    'chat',
    'chapterDiscover',
    'capabilities',
    'starter',
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
  capabilities: 'Was es kann',
  starter: 'Direkt starten',
  finale: 'Loslegen',
};

export type ChatJump = `chat:${number}`;
export type CapabilityJump = `cap:${number}`;

export type WelcomeJump = 'intro' | WelcomeStage | ChatJump | CapabilityJump;

const CAPABILITY_LABELS = [
  'Dokumente',
  'Tabellen',
  'Diagramme',
  'Recherche',
  'Wissen',
  'Besprechungen',
  'Routinen',
];

const CAPABILITY_JUMPS: ReadonlyArray<{
  value: CapabilityJump;
  label: string;
}> = CAPABILITY_LABELS.slice(1).map((label, index) => ({
  value: `cap:${index + 1}` as const,
  label,
}));

const CHAT_JUMPS: ReadonlyArray<{ value: ChatJump; label: string }> =
  CHAT_SCRIPT.flatMap((step, index) => {
    if (step.kind === 'question') {
      return [{ value: `chat:${index}` as const, label: step.question.label }];
    }
    if (step.kind === 'memory') {
      return [{ value: `chat:${index}` as const, label: 'Memory' }];
    }
    return [];
  });

export function jumpOptions(
  role: WelcomeRole,
): ReadonlyArray<{ value: WelcomeJump; label: string }> {
  return [
    { value: 'intro', label: 'Begrüßung' },
    ...ROLE_STAGES[role].flatMap((stage) => [
      { value: stage, label: STAGE_LABELS[stage] },
      ...(stage === 'chat' ? CHAT_JUMPS : []),
      ...(stage === 'capabilities' ? CAPABILITY_JUMPS : []),
    ]),
  ];
}

export function subJumpOf(
  jump: WelcomeJump,
): { stage: WelcomeStage; start: number } | undefined {
  if (jump.startsWith('chat:')) {
    return { stage: 'chat', start: Number(jump.slice(5)) };
  }
  if (jump.startsWith('cap:')) {
    return { stage: 'capabilities', start: Number(jump.slice(4)) };
  }
  return undefined;
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

export const ORG_INSTRUCTION: Record<string, string> = {
  formal:
    'Wir sind die Gemeinde Herzebrock-Clarholz. Antworten an Bürgerinnen und Bürger sind förmlich, sachlich und nennen die rechtliche Grundlage.',
  friendly:
    'Wir sind die Gemeinde Herzebrock-Clarholz. Antworten an Bürgerinnen und Bürger sind freundlich, in klarer Sprache und ohne Fachbegriffe.',
  short:
    'Wir sind die Gemeinde Herzebrock-Clarholz. Antworten an Bürgerinnen und Bürger sind kurz, direkt und nennen den nächsten Schritt.',
};
