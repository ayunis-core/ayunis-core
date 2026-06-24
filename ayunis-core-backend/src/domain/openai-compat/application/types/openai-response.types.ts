export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionToolCallResponse {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface ChatCompletionResponseMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ChatCompletionToolCallResponse[];
}

export type ChatCompletionFinishReason =
  | 'stop'
  | 'length'
  | 'tool_calls'
  | 'content_filter'
  | null;

export interface ChatCompletionResponseChoice {
  index: number;
  message: ChatCompletionResponseMessage;
  finish_reason: ChatCompletionFinishReason;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionResponseChoice[];
  usage?: ChatCompletionUsage;
}
