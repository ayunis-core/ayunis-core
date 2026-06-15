import OpenAI from 'openai';
import type { ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions';

import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '@ayunis/inference';

import { convertChunk } from './convert-chunk';
import {
  convertMessages,
  convertTool,
  convertToolChoice,
} from './convert-request';

export interface OpenAIProviderOptions {
  apiKey: string;
  /** OpenAI model id, e.g. 'gpt-4.1'. */
  model: string;
  baseUrl?: string;
  /** SDK-level retry count for transient failures. Default: 2. */
  maxRetries?: number;
}

/**
 * A minimal OpenAI Chat Completions ModelProvider. The host supplies
 * selection and credentials. Text, tool calls, finish reason and usage are
 * mapped; reasoning/thinking deltas are out of scope for this provider.
 */
export const openai = (options: OpenAIProviderOptions): ModelProvider => {
  const client = new OpenAI({
    apiKey: options.apiKey,
    ...(options.baseUrl ? { baseURL: options.baseUrl } : {}),
    ...(options.maxRetries !== undefined
      ? { maxRetries: options.maxRetries }
      : {}),
  });
  return {
    name: `openai:${options.model}`,
    stream: (request) => streamOpenAI(client, options, request),
  };
};

async function* streamOpenAI(
  client: OpenAI,
  options: OpenAIProviderOptions,
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> {
  const params = buildParams(options, request);
  const stream = await client.chat.completions.create(
    params,
    request.signal ? { signal: request.signal } : undefined,
  );
  for await (const chunk of stream) {
    const converted = convertChunk(chunk);
    if (converted) {
      yield converted;
    }
  }
}

const buildParams = (
  options: OpenAIProviderOptions,
  request: ProviderRequest,
): ChatCompletionCreateParamsStreaming => {
  const hasTools = request.tools.length > 0;
  return {
    model: options.model,
    messages: convertMessages(request.instructions, request.messages),
    ...(hasTools ? { tools: request.tools.map(convertTool) } : {}),
    ...(hasTools && request.toolChoice !== undefined
      ? { tool_choice: convertToolChoice(request.toolChoice) }
      : {}),
    stream: true,
    stream_options: { include_usage: true },
  };
};
