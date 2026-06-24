import type { Message, ProviderMetadata } from './message';
import type { ToolSchema } from './tool-schema';

export type ToolChoice = 'auto' | 'required' | { tool: string };

export type FinishReason = 'stop' | 'length' | 'tool_calls' | null;

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
}

export interface ToolCallDelta {
  /** Index of the tool call within the assistant message. */
  index: number;
  id?: string | null;
  name?: string | null;
  /** Partial JSON of the tool call arguments. */
  argumentsDelta?: string | null;
  providerMetadata?: ProviderMetadata;
}

/**
 * Provider-agnostic streaming chunk. Each chunk may carry any combination
 * of facets; absent/null facets mean "nothing for this facet in this
 * chunk".
 */
export interface ProviderChunk {
  thinkingDelta?: string | null;
  thinkingId?: string | null;
  thinkingSignature?: string | null;
  textDelta?: string | null;
  textProviderMetadata?: ProviderMetadata;
  toolCallDeltas?: ToolCallDelta[];
  finishReason?: FinishReason;
  usage?: Usage;
}

export interface ProviderRequest {
  instructions: string;
  messages: readonly Message[];
  tools: readonly ToolSchema[];
  toolChoice?: ToolChoice;
  signal?: AbortSignal;
}

/**
 * The runtime's one hard port: how to stream a model response. Provider
 * packages ship implementations (Anthropic, OpenAI, …); hosts may bring
 * their own. The host supplies a resolved instance — model selection and
 * credentials are host concerns.
 */
export interface ModelProvider {
  /** Identifying name, e.g. 'anthropic:claude-sonnet-4-5'. */
  readonly name: string;
  stream(request: ProviderRequest): AsyncIterable<ProviderChunk>;
}
