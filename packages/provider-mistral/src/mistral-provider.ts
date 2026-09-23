import { Mistral } from '@mistralai/mistralai';
import type { RetryConfig } from '@mistralai/mistralai/lib/retries';
import type { ChatCompletionStreamRequest } from '@mistralai/mistralai/models/components';

import type {
  ModelProvider,
  NormalizeProviderErrorOptions,
  ProviderChunk,
  ProviderRequest,
} from '@ayunis/inference';
import {
  normalizeProviderError,
  normalizeProviderStreamErrors,
  ToolNameCodec,
} from '@ayunis/inference';

import { convertChunk } from './convert-chunk';
import {
  convertMessages,
  convertTool,
  convertToolChoice,
} from './convert-request';

// Transport ceiling on the WHOLE stream, setup and consumption included. It
// is deliberately not model-call policy: long healthy streams must fit while
// a stalled connection is still bounded. Deadline failures are exposed with
// `timeoutSource: 'whole_stream'`. Applied via `boundedSignal`; see there for
// why this provider arms the deadline itself rather than letting the SDK do it.
export const DEFAULT_TIMEOUT_MS = 300_000;

export interface MistralProviderOptions {
  apiKey: string;
  /** Mistral model id, e.g. 'mistral-large-latest'. */
  model: string;
  baseUrl?: string;
  /**
   * SDK retry budget for direct non-streaming adapter instances. Agent and
   * direct-streaming callers must use 0. Default: 0.
   */
  maxRetries?: number;
  /**
   * Whole-stream transport safeguard in ms, not model-call policy. Default:
   * 300s.
   */
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
    retryConfig: toRetryConfig(options.maxRetries ?? 0),
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
interface BoundedSignal {
  signal: AbortSignal;
  deadlineSignal: AbortSignal;
}

function boundedSignal(
  hostSignal: AbortSignal | undefined,
  timeoutMs: number,
): BoundedSignal {
  const deadlineSignal = AbortSignal.timeout(timeoutMs);
  return {
    signal: hostSignal
      ? AbortSignal.any([hostSignal, deadlineSignal])
      : deadlineSignal,
    deadlineSignal,
  };
}

async function* streamChat(
  client: Mistral,
  model: string,
  request: ProviderRequest,
  timeoutMs: number,
): AsyncIterable<ProviderChunk> {
  const codec = new ToolNameCodec(request.tools);
  const params = buildParams(model, request, codec);
  const bounded = boundedSignal(request.signal, timeoutMs);
  const errorOptions: NormalizeProviderErrorOptions = {
    stage: 'stream_establishment',
    signal: request.signal,
    timeoutSource: 'whole_stream',
    timeoutSignal: bounded.deadlineSignal,
  };
  let stream: Awaited<ReturnType<Mistral['chat']['stream']>>;
  try {
    stream = await client.chat.stream(params, { signal: bounded.signal });
  } catch (error) {
    throw normalizeProviderError(error, errorOptions);
  }
  for await (const event of normalizeProviderStreamErrors(stream, {
    ...errorOptions,
    stage: 'stream_consumption',
  })) {
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
