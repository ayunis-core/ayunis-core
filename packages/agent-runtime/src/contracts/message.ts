/**
 * Re-export shim. The message model now lives in @ayunis/inference (the
 * shared contracts package both the runtime and provider packages depend
 * on). Kept here so the engine's existing `../contracts/message` imports
 * stay valid.
 */
export type {
  AssistantMessage,
  Message,
  MessageContent,
  MessageRole,
  ProviderMetadata,
  TextContent,
  ThinkingContent,
  ToolResultContent,
  ToolUseContent,
} from '@ayunis/inference';
