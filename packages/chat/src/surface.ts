export { ChatSurface, type ChatSurfaceProps } from './chat-surface';
export type { ChatSlots } from './chat-surface-config';
export type {
  ChatConfig,
  ChatEvents,
  ChatIntegrationItem,
  ChatIntegrations,
  ChatIntegrationSummary,
  ChatKnowledgeBaseItem,
  ChatKnowledgeBases,
  ChatLayout,
  ChatMenuStatus,
  ChatNavigationTarget,
  ChatResourceSummary,
  ChatSelectedSkill,
  ChatSkills,
  ChatTourTarget,
} from './chat-config';
export {
  createClientToolRegistry,
  type ClientToolCall,
  type ClientToolExecutor,
  type ClientToolRegistration,
} from './client-tools';
export { useContentScrollHeader } from './use-content-scroll-header';
export { ChatConversation } from './chat-conversation';
export type {
  ChatConversationAdapters,
  ChatConversationComposerConfig,
  ChatConversationHandle,
  ChatConversationProps,
  ChatConversationSlots,
  ChatThreadSnapshot,
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
