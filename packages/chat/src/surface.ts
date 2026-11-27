export { ChatSurface, type ChatSurfaceProps } from './chat-surface';
export type { ChatSlots } from './chat-surface-config';
export type {
  ChatArtifactPanel,
  ChatConfig,
  ChatContextHint,
  ChatContextSummary,
  ChatEvents,
  ChatFavorites,
  ChatIntegrationItem,
  ChatIntegrations,
  ChatIntegrationSummary,
  ChatKnowledgeBaseItem,
  ChatKnowledgeBases,
  ChatLayout,
  ChatMenuStatus,
  ChatNavigationTarget,
  ChatNewChat,
  ChatResourceSummary,
  ChatSelectedSkill,
  ChatSkills,
  ChatThreadState,
  ChatTourTarget,
  ChatTrailItem,
  ChatTrailThread,
  ChatWorkspaces,
} from './chat-config';
export {
  createClientToolRegistry,
  type ClientToolCall,
  type ClientToolExecutor,
  type ClientToolRegistration,
} from './client-tools';
export { useContentScrollHeader } from './use-content-scroll-header';
export { Conversation } from './conversation';
export type {
  ChatThreadSnapshot,
  ConversationProps,
} from './chat-conversation-config';
export {
  NewChatComposer,
  type NewChatComposerHandle,
  type NewChatComposerProps,
  type NewChatModel,
  type NewChatSelection,
  type NewChatSourceFile,
  type NewChatSourceStatus,
  type NewChatStart,
} from './new-chat-composer';
