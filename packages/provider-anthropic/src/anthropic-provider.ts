import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsStreaming } from '@anthropic-ai/sdk/resources/messages';

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

export const DEFAULT_MAX_TOKENS = 64_000;

/**
 * Any client that speaks the Anthropic Messages streaming API — the Anthropic
 * SDK and the Bedrock SDK both satisfy this, so they share the stream core.
 */
export type AnthropicCompatibleClient = {
  messages: { create: Anthropic['messages']['create'] };
};

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
  return createMessagesProvider(
    client,
    `anthropic:${options.model}`,
    options.model,
    options.maxTokens ?? DEFAULT_MAX_TOKENS,
  );
};

/**
 * Builds a ModelProvider over any Anthropic Messages-compatible client (the
 * Anthropic SDK, the Bedrock SDK). Shared by `anthropic` and `bedrock`.
 */
export const createMessagesProvider = (
  client: AnthropicCompatibleClient,
  name: string,
  model: string,
  maxTokens: number,
): ModelProvider => ({
  name,
  stream: (request) => streamMessages(client, model, maxTokens, request),
});

async function* streamMessages(
  client: AnthropicCompatibleClient,
  model: string,
  maxTokens: number,
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> {
  const params = buildParams(model, maxTokens, request);
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
  model: string,
  maxTokens: number,
  request: ProviderRequest,
): MessageCreateParamsStreaming => ({
  model,
  system: request.instructions,
  messages: convertMessages(request.messages),
  tools: request.tools.map(convertTool),
  // Anthropic rejects tool_choice when no tools are supplied, so only send it
  // alongside a non-empty tools array.
  ...(request.tools.length > 0 && request.toolChoice !== undefined
    ? { tool_choice: convertToolChoice(request.toolChoice) }
    : {}),
  max_tokens: maxTokens,
  stream: true,
});
