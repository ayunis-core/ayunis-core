import { Mistral } from '@mistralai/mistralai';
import type { RetryConfig } from '@mistralai/mistralai/lib/retries';
import type { ChatCompletionStreamRequest } from '@mistralai/mistralai/models/components';

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

// Hard ceiling on the WHOLE request, stream consumption included: the Mistral
// SDK arms AbortSignal.timeout(timeoutMs) as the fetch signal, which stays
// active while the body streams. Generous on purpose — long healthy chat
// streams must fit — while still bounding a stalled connection, which
// previously hung forever (the SDK has no default timeout). Note: the SDK
// skips this when a per-request signal is supplied, so a host-provided
// AbortSignal takes over the deadline entirely.
export const DEFAULT_TIMEOUT_MS = 300_000;

export interface MistralProviderOptions {
  apiKey: string;
  /** Mistral model id, e.g. 'mistral-large-latest'. */
  model: string;
  baseUrl?: string;
  /** SDK-level retry budget for transient failures. Default: SDK default. */
  maxRetries?: number;
  /** Whole-request timeout in ms, stream included. Default: 300s. */
  timeoutMs?: number;
}

/**
 * The shipped Mistral ModelProvider. The host supplies selection and
 * credentials; everything else (wire format, streaming, chunk parsing) lives
 * here. Text, tool calls, finish reason and usage are mapped; reasoning deltas
 * are out of scope for this provider.
 */
export const mistral = (options: MistralProviderOptions): ModelProvider => {
  const client = new Mistral({
    apiKey: options.apiKey,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    ...(options.baseUrl ? { serverURL: options.baseUrl } : {}),
    ...(options.maxRetries !== undefined
      ? { retryConfig: toRetryConfig(options.maxRetries) }
      : {}),
  });
  return {
    name: `mistral:${options.model}`,
    stream: (request) => streamChat(client, options.model, request),
  };
};

/**
 * Mistral expresses retries as a time-budgeted exponential backoff rather than
 * a fixed attempt count, so the runtime's `maxRetries` is translated into an
 * elapsed-time budget that allows roughly that many transient-failure retries.
 */
const toRetryConfig = (maxRetries: number): RetryConfig => {
  if (maxRetries <= 0) {
    return { strategy: 'none' };
  }
  return {
    strategy: 'backoff',
    backoff: {
      initialInterval: 1000,
      maxInterval: 10000,
      exponent: 2,
      maxElapsedTime: maxRetries * 20000,
    },
    retryConnectionErrors: true,
  };
};

async function* streamChat(
  client: Mistral,
  model: string,
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> {
  const params = buildParams(model, request);
  const stream = await client.chat.stream(
    params,
    request.signal ? { signal: request.signal } : undefined,
  );
  for await (const event of stream) {
    const converted = convertChunk(event);
    if (converted) {
      yield converted;
    }
  }
}

const buildParams = (
  model: string,
  request: ProviderRequest,
): ChatCompletionStreamRequest => {
  const hasTools = request.tools.length > 0;
  return {
    model,
    messages: convertMessages(request.instructions, request.messages),
    ...(hasTools ? { tools: request.tools.map(convertTool) } : {}),
    ...(hasTools && request.toolChoice !== undefined
      ? { toolChoice: convertToolChoice(request.toolChoice) }
      : {}),
    stream: true,
  };
};
