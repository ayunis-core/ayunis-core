import { ACTION_TYPE, SECONDARY_ACTION_TYPE } from './OnboardingActions';
import { ONBOARDING_SAMPLES } from './OnboardingSamples';
import { TOUR_TARGET } from './OnboardingTourTargets';

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
