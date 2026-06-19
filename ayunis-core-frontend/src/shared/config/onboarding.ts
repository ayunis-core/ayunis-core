export const TOUR_TARGET = {
  configureModelsLanguage: 'configure-models-language',
  inviteUsers: 'invite-users',
  createTeam: 'create-team',
  addTeamMember: 'add-team-member',
  chatUpload: 'chat-upload',
  anonymousMode: 'anonymous-mode',
  voiceInput: 'voice-input',
  modelSelector: 'model-selector',
  pinnedSkills: 'pinned-skills',
  pinSkill: 'pin-skill',
  createSkill: 'create-skill',
  createKnowledgeBase: 'create-knowledge-base',
  addDocuments: 'add-documents',
  systemPrompt: 'system-prompt',
  themeSettings: 'theme-settings',
  sendMessage: 'send-message',
} as const;

export type TourTargetName = (typeof TOUR_TARGET)[keyof typeof TOUR_TARGET];

export const ACTION_TYPE = {
  prompt: 'prompt',
  link: 'link',
  external: 'external',
} as const;

export const SECONDARY_ACTION_TYPE = {
  external: 'external',
  helpCenter: 'help-center',
} as const;

type OnboardingAction =
  | { type: typeof ACTION_TYPE.prompt; attachment?: string }
  | { type: typeof ACTION_TYPE.link; to: string; spotlight?: TourTargetName }
  | { type: typeof ACTION_TYPE.external; url: string };

type OnboardingSecondaryAction =
  | { type: typeof SECONDARY_ACTION_TYPE.external; url: string }
  | { type: typeof SECONDARY_ACTION_TYPE.helpCenter; path: string };

const ONBOARDING_SAMPLES = {
  protokoll: '/onboarding-samples/sitzungsprotokoll-gemeinderat.txt',
  stadtlauf: '/onboarding-samples/stadtlauf-teilnehmer.csv',
} as const;

export const ONBOARDING_CATEGORIES = [
  {
    id: 'workspace',
    translationKey: 'workspace',
    adminOnly: true,
    steps: [
      {
        id: 'configureModels',
        translationKey: 'configureModels',
        action: {
          type: ACTION_TYPE.link,
          to: '/admin-settings/models',
          spotlight: TOUR_TARGET.configureModelsLanguage,
        },
      },
      {
        id: 'inviteColleagues',
        translationKey: 'inviteColleagues',
        action: {
          type: ACTION_TYPE.link,
          to: '/admin-settings/users',
          spotlight: TOUR_TARGET.inviteUsers,
        },
      },
      {
        id: 'createTeams',
        translationKey: 'createTeams',
        action: {
          type: ACTION_TYPE.link,
          to: '/admin-settings/teams',
          spotlight: TOUR_TARGET.createTeam,
        },
      },
    ],
  },
  {
    id: 'firstChat',
    translationKey: 'firstChat',
    steps: [
      {
        id: 'sendFirstMessage',
        translationKey: 'sendFirstMessage',
        action: { type: ACTION_TYPE.prompt },
      },
      {
        id: 'uploadDocument',
        translationKey: 'uploadDocument',
        action: {
          type: ACTION_TYPE.link,
          to: '/chat',
          spotlight: TOUR_TARGET.chatUpload,
        },
      },
      {
        id: 'anonymousMode',
        translationKey: 'anonymousMode',
        action: {
          type: ACTION_TYPE.link,
          to: '/chat',
          spotlight: TOUR_TARGET.anonymousMode,
        },
      },
    ],
  },
  {
    id: 'skills',
    translationKey: 'skills',
    steps: [
      {
        id: 'whatAreSkills',
        translationKey: 'whatAreSkills',
        action: { type: ACTION_TYPE.prompt },
        secondaryAction: {
          type: SECONDARY_ACTION_TYPE.helpCenter,
          path: 'skills/',
        },
      },
      {
        id: 'installSkill',
        translationKey: 'installSkill',
        action: {
          type: ACTION_TYPE.external,
          url: 'https://marketplace.ayunis.com/',
        },
      },
      {
        id: 'createSkill',
        translationKey: 'createSkill',
        action: {
          type: ACTION_TYPE.link,
          to: '/skills',
          spotlight: TOUR_TARGET.createSkill,
        },
      },
      {
        id: 'useSkillInChat',
        translationKey: 'useSkillInChat',
        action: {
          type: ACTION_TYPE.link,
          to: '/skills',
          spotlight: TOUR_TARGET.pinSkill,
        },
      },
      {
        id: 'activateSkillInChat',
        translationKey: 'activateSkillInChat',
        action: {
          type: ACTION_TYPE.link,
          to: '/chat',
          spotlight: TOUR_TARGET.pinnedSkills,
        },
      },
    ],
  },
  {
    id: 'knowledgeManagement',
    translationKey: 'knowledgeManagement',
    steps: [
      {
        id: 'createKnowledgeBase',
        translationKey: 'createKnowledgeBase',
        action: {
          type: ACTION_TYPE.link,
          to: '/knowledge-bases',
          spotlight: TOUR_TARGET.createKnowledgeBase,
        },
        secondaryAction: {
          type: SECONDARY_ACTION_TYPE.helpCenter,
          path: 'knowledge-collections/',
        },
      },
      {
        id: 'addDocuments',
        translationKey: 'addDocuments',
        dependsOn: 'createKnowledgeBase',
        action: {
          type: ACTION_TYPE.link,
          to: '/knowledge-bases',
          spotlight: TOUR_TARGET.addDocuments,
        },
      },
      {
        id: 'useKnowledgeBaseInChat',
        translationKey: 'useKnowledgeBaseInChat',
        dependsOn: 'addDocuments',
        action: {
          type: ACTION_TYPE.link,
          to: '/chat',
          spotlight: TOUR_TARGET.chatUpload,
        },
      },
    ],
  },
  {
    id: 'workflows',
    translationKey: 'workflows',
    steps: [
      {
        id: 'writeEmail',
        translationKey: 'writeEmail',
        action: { type: ACTION_TYPE.prompt },
      },
      {
        id: 'createDocument',
        translationKey: 'createDocument',
        action: { type: ACTION_TYPE.prompt },
      },
      {
        id: 'summarizeDocument',
        translationKey: 'summarizeDocument',
        action: {
          type: ACTION_TYPE.prompt,
          attachment: ONBOARDING_SAMPLES.protokoll,
        },
      },
      {
        id: 'analyzeData',
        translationKey: 'analyzeData',
        action: {
          type: ACTION_TYPE.prompt,
          attachment: ONBOARDING_SAMPLES.stadtlauf,
        },
      },
      {
        id: 'createFlowchart',
        translationKey: 'createFlowchart',
        action: { type: ACTION_TYPE.prompt },
      },
      {
        id: 'createCalendarEntry',
        translationKey: 'createCalendarEntry',
        action: { type: ACTION_TYPE.prompt },
      },
      {
        id: 'webResearch',
        translationKey: 'webResearch',
        action: { type: ACTION_TYPE.prompt },
      },
    ],
  },
  {
    id: 'advanced',
    translationKey: 'advanced',
    steps: [
      {
        id: 'tryVoiceInput',
        translationKey: 'tryVoiceInput',
        action: {
          type: ACTION_TYPE.link,
          to: '/chat',
          spotlight: TOUR_TARGET.voiceInput,
        },
      },
      {
        id: 'customInstructions',
        translationKey: 'customInstructions',
        action: {
          type: ACTION_TYPE.link,
          to: '/settings/chat',
          spotlight: TOUR_TARGET.systemPrompt,
        },
      },
      {
        id: 'generateImage',
        translationKey: 'generateImage',
        action: { type: ACTION_TYPE.prompt },
      },
      {
        id: 'switchTheme',
        translationKey: 'switchTheme',
        action: {
          type: ACTION_TYPE.link,
          to: '/settings/general',
          spotlight: TOUR_TARGET.themeSettings,
        },
      },
    ],
  },
] as const;

export type OnboardingStepId =
  (typeof ONBOARDING_CATEGORIES)[number]['steps'][number]['id'];

export interface OnboardingStep {
  id: OnboardingStepId;
  translationKey: string;
  dependsOn?: OnboardingStepId;
  action?: OnboardingAction;
  secondaryAction?: OnboardingSecondaryAction;
}

export interface OnboardingCategory {
  id: string;
  translationKey: string;
  steps: readonly OnboardingStep[];
  adminOnly?: boolean;
  helpPath?: string;
}
