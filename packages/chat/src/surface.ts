export { ChatSurface, type ChatSurfaceProps } from './chat-surface';
export type {
  ChatCapabilities,
  ChatSlots,
  ChatSurfaceConfig,
} from './chat-surface-config';
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
  ChatModelAdapter,
  ChatThreadSnapshot,
} from './chat-conversation-config';
export {
  ConfiguredComposer,
  type ConfiguredComposerProps,
  type ConfiguredComposerRef,
} from './configured-composer';
export {
  IntegrationsMenuAction,
  KnowledgeBasesMenuAction,
  SkillsMenuAction,
  type ComposerMenuStatus,
} from './composer-menu-actions';
