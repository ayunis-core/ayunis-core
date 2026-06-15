/**
 * Opaque provider-specific metadata carried through chunks and message
 * content so reasoning models round-trip correctly (e.g. Anthropic thinking
 * signatures, OpenAI reasoning block ids, Gemini thought signatures).
 * The runtime never inspects it.
 */
export type ProviderMetadata = Readonly<Record<string, unknown>> | null;

export interface TextContent {
  type: 'text';
  text: string;
  providerMetadata?: ProviderMetadata;
}

export interface ThinkingContent {
  type: 'thinking';
  thinking: string;
  id?: string | null;
  signature?: string | null;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
  providerMetadata?: ProviderMetadata;
}

export interface ToolResultContent {
  type: 'tool_result';
  toolCallId: string;
  toolName: string;
  result: string;
  isError?: boolean;
}

export type MessageContent =
  | TextContent
  | ThinkingContent
  | ToolUseContent
  | ToolResultContent;

/**
 * `system` carries an in-thread system instruction (distinct from the
 * top-level `instructions`). Providers with a native system role (OpenAI Chat
 * Completions) emit it as such; providers without one (Anthropic) fold it into
 * a user turn.
 */
export type MessageRole = 'user' | 'assistant' | 'tool_result' | 'system';

export interface Message {
  role: MessageRole;
  content: MessageContent[];
}

export interface AssistantMessage extends Message {
  role: 'assistant';
}
