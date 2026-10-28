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

// Bounds only how long the response may take to start (first event), like the
// OpenAI and Anthropic providers. Consumption is unbounded here: long
// healthy streams must not be cut off, and stalled consumption is the caller's
// idle watchdog's job. Failures report `timeoutSource: 'response_start'`.
export const DEFAULT_TIMEOUT_MS = 120_000;

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
  /** Timeout in ms until the response starts. Default: 120s. */
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
    server: 'eu',
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

async function* streamChat(
  client: Mistral,
  model: string,
  request: ProviderRequest,
  timeoutMs: number,
): AsyncIterable<ProviderChunk> {
  const codec = new ToolNameCodec(request.tools);
  const params = buildParams(model, request, codec);
  const deadline = responseStartDeadline(request.signal, timeoutMs);
  const errorOptions: NormalizeProviderErrorOptions = {
    stage: 'stream_establishment',
    signal: request.signal,
    timeoutSource: 'response_start',
    timeoutSignal: deadline.timeoutSignal,
  };
  try {
    let stream: Awaited<ReturnType<Mistral['chat']['stream']>>;
    try {
      stream = await client.chat.stream(params, { signal: deadline.signal });
    } catch (error) {
      throw normalizeProviderError(error, errorOptions);
    }
    for await (const event of normalizeProviderStreamErrors(
      readUntilAborted(stream, deadline.signal),
      {
        ...errorOptions,
        stage: 'stream_consumption',
      },
    )) {
      const converted = convertChunk(event, codec);
      if (converted) {
        // The host's idle watchdog arms on the first yielded chunk, not on
        // events that convert to nothing (e.g. role-only deltas).
        deadline.clear();
        yield converted;
      }
    }
  } finally {
    deadline.clear();
  }
}

interface ResponseStartDeadline {
  signal: AbortSignal;
  timeoutSignal: AbortSignal;
  clear: () => void;
}

/**
 * The SDK's own `timeoutMs` would bound the whole request, consumption
 * included, and it arms only when no signal is passed (`lib/sdks.js`). So the
 * client gets no `timeoutMs`, and the request always carries this deadline
 * instead. It runs until the first event, not until `chat.stream` resolves:
 * that resolves on SSE headers, and the hosts' idle watchdogs only arm on the
 * first chunk, so clearing earlier would leave headers-then-silence unbounded.
 */
function responseStartDeadline(
  hostSignal: AbortSignal | undefined,
  timeoutMs: number,
): ResponseStartDeadline {
  const controller = new AbortController();
  const timer = setTimeout(
    () =>
      controller.abort(
        new DOMException(
          `Mistral response did not start within ${timeoutMs}ms`,
          'TimeoutError',
        ),
      ),
    timeoutMs,
  );
  return {
    signal: hostSignal
      ? AbortSignal.any([hostSignal, controller.signal])
      : controller.signal,
    timeoutSignal: controller.signal,
    clear: () => clearTimeout(timer),
  };
}

/**
 * Once `chat.stream` resolves, aborting the request signal can no longer be
 * trusted to reach the body read: the SDK clones the Request, and Node links a
 * clone's signal only weakly, so after GC the abort is silently lost. Racing
 * each read against the signal and cancelling the reader (which, unlike the
 * async iterator's `return()`, releases a pending read and closes the socket)
 * keeps both the deadline and host cancellation effective.
 */
async function* readUntilAborted<T>(
  stream: ReadableStream<T>,
  signal: AbortSignal,
): AsyncIterable<T> {
  const reader = stream.getReader();
  let onAbort = (): void => undefined;
  const aborted = new Promise<never>((_, reject) => {
    // normalizeProviderError matches the signal's own reason by identity.
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    onAbort = () => reject(signal.reason);
  });
  aborted.catch(() => undefined);
  if (signal.aborted) onAbort();
  signal.addEventListener('abort', onAbort, { once: true });
  try {
    for (;;) {
      const result = await Promise.race([reader.read(), aborted]);
      if (result.done) return;
      yield result.value;
    }
  } finally {
    signal.removeEventListener('abort', onAbort);
    await reader.cancel().catch(() => undefined);
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
