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
