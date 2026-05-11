import { GETTING_STARTED_SAMPLE } from '@/shared/lib/getting-started-samples';
import { SPOTLIGHT_TARGET } from '@/shared/lib/spotlight-targets';
import type { GettingStartedCategory } from './types';

export const GETTING_STARTED_CATEGORIES: GettingStartedCategory[] = [
  {
    id: 'workspace',
    translationKey: 'workspace',
    adminOnly: true,
    steps: [
      {
        id: 'configureModels',
        translationKey: 'configureModels',
        action: {
          type: 'link',
          to: '/admin-settings/models',
          spotlight: SPOTLIGHT_TARGET.configureModelsLanguage,
        },
      },
      {
        id: 'inviteColleagues',
        translationKey: 'inviteColleagues',
        action: {
          type: 'link',
          to: '/admin-settings/users',
          spotlight: SPOTLIGHT_TARGET.inviteUsers,
        },
      },
      {
        id: 'createTeams',
        translationKey: 'createTeams',
        action: {
          type: 'link',
          to: '/admin-settings/teams',
          spotlight: SPOTLIGHT_TARGET.createTeam,
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
        action: { type: 'prompt' },
      },
      {
        id: 'uploadDocument',
        translationKey: 'uploadDocument',
        action: {
          type: 'link',
          to: '/chat',
          spotlight: SPOTLIGHT_TARGET.chatUpload,
        },
      },
      {
        id: 'anonymousMode',
        translationKey: 'anonymousMode',
        action: {
          type: 'link',
          to: '/chat',
          spotlight: SPOTLIGHT_TARGET.anonymousMode,
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
        action: { type: 'prompt' },
        secondaryAction: {
          type: 'help-center',
          path: 'skills/',
        },
      },
      {
        id: 'installSkill',
        translationKey: 'installSkill',
        action: {
          type: 'external',
          url: 'https://marketplace.ayunis.com/',
        },
      },
      {
        id: 'createSkill',
        translationKey: 'createSkill',
        action: {
          type: 'link',
          to: '/skills',
          spotlight: SPOTLIGHT_TARGET.createSkill,
        },
      },
      {
        id: 'useSkillInChat',
        translationKey: 'useSkillInChat',
        action: {
          type: 'link',
          to: '/skills',
          spotlight: SPOTLIGHT_TARGET.pinSkill,
        },
      },
      {
        id: 'activateSkillInChat',
        translationKey: 'activateSkillInChat',
        action: {
          type: 'link',
          to: '/chat',
          spotlight: SPOTLIGHT_TARGET.pinnedSkills,
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
          type: 'link',
          to: '/knowledge-bases',
          spotlight: SPOTLIGHT_TARGET.createKnowledgeBase,
        },
        secondaryAction: {
          type: 'help-center',
          path: 'knowledge-collections/',
        },
      },
      {
        id: 'addDocuments',
        translationKey: 'addDocuments',
        dependsOn: 'createKnowledgeBase',
        action: {
          type: 'link',
          to: '/knowledge-bases',
          spotlight: SPOTLIGHT_TARGET.addDocuments,
        },
      },
      {
        id: 'useKnowledgeBaseInChat',
        translationKey: 'useKnowledgeBaseInChat',
        dependsOn: 'addDocuments',
        action: {
          type: 'link',
          to: '/chat',
          spotlight: SPOTLIGHT_TARGET.chatUpload,
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
        action: { type: 'prompt' },
      },
      {
        id: 'createDocument',
        translationKey: 'createDocument',
        action: { type: 'prompt' },
      },
      {
        id: 'summarizeDocument',
        translationKey: 'summarizeDocument',
        action: {
          type: 'prompt',
          attachment: GETTING_STARTED_SAMPLE.protokoll,
        },
      },
      {
        id: 'analyzeData',
        translationKey: 'analyzeData',
        action: {
          type: 'prompt',
          attachment: GETTING_STARTED_SAMPLE.stadtlauf,
        },
      },
      {
        id: 'createFlowchart',
        translationKey: 'createFlowchart',
        action: { type: 'prompt' },
      },
      {
        id: 'createCalendarEntry',
        translationKey: 'createCalendarEntry',
        action: { type: 'prompt' },
      },
      {
        id: 'webResearch',
        translationKey: 'webResearch',
        action: { type: 'prompt' },
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
          type: 'link',
          to: '/chat',
          spotlight: SPOTLIGHT_TARGET.voiceInput,
        },
      },
      {
        id: 'customInstructions',
        translationKey: 'customInstructions',
        action: {
          type: 'link',
          to: '/settings/chat',
          spotlight: SPOTLIGHT_TARGET.systemPrompt,
        },
      },
      {
        id: 'generateImage',
        translationKey: 'generateImage',
        action: { type: 'prompt' },
      },
      {
        id: 'switchTheme',
        translationKey: 'switchTheme',
        action: {
          type: 'link',
          to: '/settings/general',
          spotlight: SPOTLIGHT_TARGET.themeSettings,
        },
      },
    ],
  },
];
