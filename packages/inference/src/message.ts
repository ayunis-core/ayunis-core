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

/**
 * An image supplied in an input message, already resolved to inline data.
 * Fetching, validation and access control (storage, tenancy) are host
 * concerns done before the message reaches a provider — providers only ever
 * see resolved bytes.
 */
export interface ImageContent {
  type: 'image';
  /** Base64-encoded image bytes (no `data:` prefix). */
  data: string;
  /** MIME type, e.g. 'image/png'. */
  mediaType: string;
}

export type MessageContent =
  | TextContent
  | ThinkingContent
  | ToolUseContent
  | ToolResultContent
  | ImageContent;

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
