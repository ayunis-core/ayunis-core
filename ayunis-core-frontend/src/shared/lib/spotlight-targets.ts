/**
 * Canonical list of spotlight target identifiers used across the app.
 * Use these constants in both `<SpotlightTarget>` and step config to keep
 * the two ends of the wire in sync.
 */
export const SPOTLIGHT_TARGET = {
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

export type SpotlightTargetName =
  (typeof SPOTLIGHT_TARGET)[keyof typeof SPOTLIGHT_TARGET];
