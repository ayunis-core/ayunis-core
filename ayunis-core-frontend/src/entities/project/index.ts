export {
  PROJECT_ICONS,
  PROJECT_ICON_OPTIONS,
  isCustomColor,
  isLightColor,
  DEFAULT_CUSTOM_COLOR,
  PROJECT_COLOR_ORDER,
  PROJECT_COLOR_LABELS,
  PROJECT_COLOR_TEXTS,
  PROJECT_COLOR_TINTS,
  PROJECT_COLOR_SWATCHES,
  defaultProjectColor,
  type ProjectIconKey,
  type ProjectColorKey,
  type ProjectColor,
} from './model/appearance';
export { ProjectIcon } from './ui/ProjectIcon';
export { ProjectAppearancePicker } from './ui/ProjectAppearancePicker';
export {
  CURRENT_USER,
  availableSkills,
  SKILL_DESCRIPTIONS,
  KNOWLEDGE_BASE_FILES,
  knowledgeBaseFileCount,
  GENERATED_CONTENT_GROUP,
  GENERATED_CONTENT_LABELS,
  GENERATED_CONTENT_ORDER,
  type GeneratedContentGroup,
  type GeneratedContentKind,
  type MockChartParams,
  type MockEmailParams,
  availableKnowledgeBases,
  orgPeople,
  orgTeams,
  MY_TEAM_IDS,
  type MockProject,
  type OrgPerson,
  type OrgTeam,
  type ProjectChat,
  type ProjectCollaborator,
  type ProjectDocument,
  type ProjectKnowledgeBase,
  type ProjectMessage,
  type ProjectRole,
  type ProjectSkill,
  type ProjectTeam,
  type ProjectVisibility,
} from './model/mock';
export {
  useProjects,
  addProject,
  addSkillsToProject,
  addKnowledgeBasesToProject,
  addDocumentToProject,
  addChatToProject,
  removeSkillFromProject,
  removeKnowledgeBaseFromProject,
  removeDocumentFromProject,
  toggleGeneratedDocumentShared,
  removeGeneratedDocument,
  renameChatInProject,
  removeChatFromProject,
  toggleChatPinned,
  toggleProjectStarred,
  removeProject,
  reorderProjects,
  moveProjectInSidebar,
  addCollaboratorToProject,
  updateCollaboratorRole,
  removeCollaboratorFromProject,
  setTeamMemberOverride,
  updateProjectDetails,
  updateProjectPrompt,
  setProjectVisibility,
  updateProjectSettings,
  addTeamToProject,
  updateTeamRole,
  removeTeamFromProject,
} from './model/store';
export { FEATURES, ITERATION } from './model/iteration';
export { isPrivateProject } from './model/visibility';
export { ProjectAvatars } from './ui/ProjectAvatars';
export { ProjectTeamBadge } from './ui/ProjectTeamBadge';
export { ProjectVisibilityIcon } from './ui/ProjectVisibilityIcon';
export { CreateProjectDialog } from './ui/CreateProjectDialog';
export { ProjectSettingsDialog } from './ui/ProjectSettingsDialog';
export { ProjectMenuGroups } from './ui/ProjectMenuGroups';
export { ShareProjectDialog } from './ui/ShareProjectDialog';
