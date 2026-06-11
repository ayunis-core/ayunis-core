import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsStreaming } from '@anthropic-ai/sdk/resources/messages';

import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '../../contracts/provider';
import { convertChunk } from './convert-chunk';
import {
  convertMessages,
  convertTool,
  convertToolChoice,
} from './convert-request';

const DEFAULT_MAX_TOKENS = 64_000;

export interface AnthropicProviderOptions {
  apiKey: string;
  /** Anthropic model id, e.g. 'claude-sonnet-4-5'. */
  model: string;
  maxTokens?: number;
  baseUrl?: string;
  /** SDK-level retry count for transient failures. Default: 2. */
  maxRetries?: number;
}

/**
 * The shipped Anthropic ModelProvider. The host supplies selection and
 * credentials; everything else (wire format, streaming, chunk parsing)
 * lives here.
 */
export const anthropic = (options: AnthropicProviderOptions): ModelProvider => {
  const client = new Anthropic({
    apiKey: options.apiKey,
    ...(options.baseUrl ? { baseURL: options.baseUrl } : {}),
    ...(options.maxRetries !== undefined
      ? { maxRetries: options.maxRetries }
      : {}),
  });
  return {
    name: `anthropic:${options.model}`,
    stream: (request) => streamAnthropic(client, options, request),
  };
};

async function* streamAnthropic(
  client: Anthropic,
  options: AnthropicProviderOptions,
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> {
  const params = buildParams(options, request);
  const stream = await client.messages.create(
    params,
    request.signal ? { signal: request.signal } : undefined,
  );
  for await (const event of stream) {
    const chunk = convertChunk(event);
    if (chunk) {
      yield chunk;
    }
  }
}

const buildParams = (
  options: AnthropicProviderOptions,
  request: ProviderRequest,
): MessageCreateParamsStreaming => ({
  model: options.model,
  system: request.instructions,
  messages: convertMessages(request.messages),
  tools: request.tools.map(convertTool),
  ...(request.toolChoice !== undefined
    ? { tool_choice: convertToolChoice(request.toolChoice) }
    : {}),
  max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
  stream: true,
});
