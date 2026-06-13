import OpenAI, { AzureOpenAI } from 'openai';
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

export interface AzureProviderOptions {
  apiKey: string;
  /** Azure resource endpoint, e.g. 'https://my-resource.openai.azure.com'. */
  endpoint: string;
  /** Azure API version, e.g. '2024-10-21'. */
  apiVersion: string;
  /** Azure deployment name, passed through as the model id. */
  model: string;
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
  return createProvider(client, `openai:${options.model}`, options.model);
};

/**
 * Azure OpenAI ModelProvider. Same Chat Completions protocol as `openai`,
 * only the client differs (resource endpoint + API version). `model` is the
 * Azure deployment name.
 */
export const azure = (options: AzureProviderOptions): ModelProvider => {
  const client = new AzureOpenAI({
    apiKey: options.apiKey,
    endpoint: options.endpoint,
    apiVersion: options.apiVersion,
    ...(options.maxRetries !== undefined
      ? { maxRetries: options.maxRetries }
      : {}),
  });
  return createProvider(client, `azure:${options.model}`, options.model);
};

const createProvider = (
  client: OpenAI,
  name: string,
  model: string,
): ModelProvider => ({
  name,
  stream: (request) => streamChat(client, model, request),
});

async function* streamChat(
  client: OpenAI,
  model: string,
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> {
  const params = buildParams(model, request);
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
  model: string,
  request: ProviderRequest,
): ChatCompletionCreateParamsStreaming => {
  const hasTools = request.tools.length > 0;
  return {
    model,
    messages: convertMessages(request.instructions, request.messages),
    ...(hasTools ? { tools: request.tools.map(convertTool) } : {}),
    ...(hasTools && request.toolChoice !== undefined
      ? { tool_choice: convertToolChoice(request.toolChoice) }
      : {}),
    stream: true,
    stream_options: { include_usage: true },
  };
};
