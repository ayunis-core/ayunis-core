import type {
  ChatCompletionFinishReason,
  ChatCompletionUsage,
} from './openai-response.types';

export interface ChatCompletionChunkToolCallDelta {
  index: number;
  id?: string;
  type?: 'function';
  function?: { name?: string; arguments?: string };
}

export interface ChatCompletionChunkDelta {
  role?: 'assistant';
  content?: string | null;
  tool_calls?: ChatCompletionChunkToolCallDelta[];
}

export interface ChatCompletionChunkChoice {
  index: number;
  delta: ChatCompletionChunkDelta;
  finish_reason: ChatCompletionFinishReason;
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChunkChoice[];
  usage?: ChatCompletionUsage;
}
