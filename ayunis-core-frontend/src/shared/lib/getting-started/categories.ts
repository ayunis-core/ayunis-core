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
          spotlight: 'configure-models-language',
        },
      },
      {
        id: 'inviteColleagues',
        translationKey: 'inviteColleagues',
        action: {
          type: 'link',
          to: '/admin-settings/users',
          spotlight: 'invite-users',
        },
      },
      {
        id: 'createTeams',
        translationKey: 'createTeams',
        action: {
          type: 'link',
          to: '/admin-settings/teams',
          spotlight: 'create-team',
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
        action: { type: 'prompt', prompt: 'sendFirstMessage' },
      },
      {
        id: 'uploadDocument',
        translationKey: 'uploadDocument',
        action: {
          type: 'link',
          to: '/chat',
          spotlight: 'chat-upload',
        },
      },
      {
        id: 'anonymousMode',
        translationKey: 'anonymousMode',
        action: {
          type: 'link',
          to: '/chat',
          spotlight: 'anonymous-mode',
        },
      },
    ],
  },
  {
    id: 'skills',
    translationKey: 'skills',
    helpUrl: 'https://docs.ayunis.com/de/skills/',
    steps: [
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
          spotlight: 'create-skill',
        },
      },
      {
        id: 'useSkillInChat',
        translationKey: 'useSkillInChat',
        action: {
          type: 'link',
          to: '/skills',
          spotlight: 'pin-skill',
        },
      },
      {
        id: 'activateSkillInChat',
        translationKey: 'activateSkillInChat',
        action: {
          type: 'link',
          to: '/chat',
          spotlight: 'pinned-skills',
        },
      },
    ],
  },
  {
    id: 'knowledgeManagement',
    translationKey: 'knowledgeManagement',
    helpUrl: 'https://docs.ayunis.com/de/knowledge-collections/',
    steps: [
      {
        id: 'createKnowledgeBase',
        translationKey: 'createKnowledgeBase',
        action: {
          type: 'link',
          to: '/knowledge-bases',
          spotlight: 'create-knowledge-base',
        },
      },
      {
        id: 'addDocuments',
        translationKey: 'addDocuments',
        dependsOn: 'createKnowledgeBase',
        action: {
          type: 'link',
          to: '/knowledge-bases',
          spotlight: 'add-documents',
        },
      },
      {
        id: 'useKnowledgeBaseInChat',
        translationKey: 'useKnowledgeBaseInChat',
        dependsOn: 'addDocuments',
        action: {
          type: 'link',
          to: '/chat',
          spotlight: 'chat-upload',
        },
      },
    ],
  },
  {
    id: 'workflows',
    translationKey: 'workflows',
    steps: [
      {
        id: 'citizenInquiry',
        translationKey: 'citizenInquiry',
        action: { type: 'prompt', prompt: 'citizenInquiry' },
      },
      {
        id: 'simplifyLaw',
        translationKey: 'simplifyLaw',
        action: { type: 'prompt', prompt: 'simplifyLaw' },
      },
      {
        id: 'internalMemo',
        translationKey: 'internalMemo',
        action: { type: 'prompt', prompt: 'internalMemo' },
      },
      {
        id: 'meetingAgenda',
        translationKey: 'meetingAgenda',
        action: { type: 'prompt', prompt: 'meetingAgenda' },
      },
      {
        id: 'translateCitizenInfo',
        translationKey: 'translateCitizenInfo',
        action: { type: 'prompt', prompt: 'translateCitizenInfo' },
      },
      {
        id: 'checkReadability',
        translationKey: 'checkReadability',
        action: { type: 'prompt', prompt: 'checkReadability' },
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
          spotlight: 'voice-input',
        },
      },
      {
        id: 'customInstructions',
        translationKey: 'customInstructions',
        action: {
          type: 'link',
          to: '/settings/chat',
          spotlight: 'system-prompt',
        },
      },
      {
        id: 'generateImage',
        translationKey: 'generateImage',
        action: { type: 'prompt', prompt: 'generateImage' },
      },
      {
        id: 'switchTheme',
        translationKey: 'switchTheme',
        action: {
          type: 'link',
          to: '/settings/general',
          spotlight: 'theme-settings',
        },
      },
    ],
  },
];
