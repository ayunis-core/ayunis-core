/**
 * OpenAI chat-completion request shape used by the application layer.
 *
 * The presenter-layer DTO (`chat-completion-request.dto.ts`) attaches
 * class-validator decorators for HTTP input validation and is structurally
 * compatible with these interfaces — controllers pass the validated DTO
 * instance to the use case typed as `OpenAIChatCompletionRequest`.
 *
 * Keeping the shape here (not in presenters) is what lets the use case
 * stay decoupled from HTTP concerns.
 */

export interface OpenAIChatCompletionFunction {
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface OpenAIChatCompletionTool {
  type: 'function';
  function: OpenAIChatCompletionFunction;
}

export interface OpenAIChatCompletionFunctionCall {
  name: string;
  arguments: string;
}

export interface OpenAIChatCompletionToolCall {
  id: string;
  type: 'function';
  function: OpenAIChatCompletionFunctionCall;
}

export interface OpenAIChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string | null;
  tool_call_id?: string;
  tool_calls?: OpenAIChatCompletionToolCall[];
  name?: string;
}

export type OpenAIChatCompletionToolChoice =
  | 'auto'
  | 'required'
  | 'none'
  | { type: 'function'; function: { name: string } };

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatCompletionMessage[];
  stream?: boolean;
  tools?: OpenAIChatCompletionTool[];
  tool_choice?: OpenAIChatCompletionToolChoice;
}
