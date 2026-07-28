import { Mistral } from '@mistralai/mistralai';
import type { RetryConfig } from '@mistralai/mistralai/lib/retries';
import type { ChatCompletionStreamRequest } from '@mistralai/mistralai/models/components';

import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '@ayunis/inference';
import { ToolNameCodec } from '@ayunis/inference';

import { convertChunk } from './convert-chunk';
import {
  convertMessages,
  convertTool,
  convertToolChoice,
} from './convert-request';

// Hard ceiling on the WHOLE request, stream consumption included. Generous on
// purpose — long healthy chat streams must fit — while still bounding a
// stalled connection, which hung forever before it existed (the SDK has no
// default timeout). Applied via `boundedSignal`; see there for why this
// provider arms the deadline itself rather than letting the SDK do it.
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
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const client = new Mistral({
    apiKey: options.apiKey,
    timeoutMs,
    ...(options.baseUrl ? { serverURL: options.baseUrl } : {}),
    ...(options.maxRetries !== undefined
      ? { retryConfig: toRetryConfig(options.maxRetries) }
      : {}),
  });
  return {
    name: `mistral:${options.model}`,
    stream: (request) => streamChat(client, options.model, request, timeoutMs),
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

/**
 * The SDK arms `AbortSignal.timeout(timeoutMs)` only when the caller supplies
 * no signal of its own (`lib/sdks.js`: `if (!fetchOptions?.signal && ...)`), so
 * a host-provided signal would silently delete the deadline. Composing the two
 * keeps `timeoutMs` meaningful whether or not the host cancels. Note this makes
 * the ceiling span the whole call rather than each retried attempt, which is
 * what "whole request" was always meant to mean.
 */
function boundedSignal(
  hostSignal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const deadline = AbortSignal.timeout(timeoutMs);
  return hostSignal ? AbortSignal.any([hostSignal, deadline]) : deadline;
}

async function* streamChat(
  client: Mistral,
  model: string,
  request: ProviderRequest,
  timeoutMs: number,
): AsyncIterable<ProviderChunk> {
  const codec = new ToolNameCodec(request.tools);
  const params = buildParams(model, request, codec);
  const stream = await client.chat.stream(params, {
    signal: boundedSignal(request.signal, timeoutMs),
  });
  for await (const event of stream) {
    const converted = convertChunk(event, codec);
    if (converted) {
      yield converted;
    }
  }
}

const buildParams = (
  model: string,
  request: ProviderRequest,
  codec: ToolNameCodec,
): ChatCompletionStreamRequest => {
  const hasTools = request.tools.length > 0;
  return {
    model,
    messages: convertMessages(request.instructions, request.messages, codec),
    ...(hasTools
      ? { tools: request.tools.map((tool) => convertTool(tool, codec)) }
      : {}),
    ...(hasTools && request.toolChoice !== undefined
      ? { toolChoice: convertToolChoice(request.toolChoice, codec) }
      : {}),
    stream: true,
  };
};
