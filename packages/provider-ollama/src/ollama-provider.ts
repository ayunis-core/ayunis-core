import { setTimeout as delay } from 'node:timers/promises';

import { Ollama } from 'ollama';
import type { ChatRequest } from 'ollama';

import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '@ayunis/inference';
import {
  ToolNameCodec,
  normalizeProviderError,
  normalizeProviderStreamErrors,
} from '@ayunis/inference';

import { convertChunk } from './convert-chunk';
import { convertMessages, convertTool } from './convert-request';

/** Context window preserved from the pre-runtime Ollama handlers. */
const DEFAULT_NUM_CTX = 30000;
/** Base backoff for the initial-request retry, doubled per attempt. */
const RETRY_BASE_DELAY_MS = 1000;

export interface OllamaProviderOptions {
  /** Ollama host, e.g. 'http://localhost:11434'. */
  baseUrl: string;
  /** Ollama model id, e.g. 'llama3.1'. */
  model: string;
  /** Extra request headers, e.g. Bearer auth for the Ayunis-hosted variant. */
  headers?: Record<string, string>;
  /**
   * Initial-request retry budget only for direct non-streaming adapter
   * instances. Streaming callers must pass 0. Default: 0.
   */
  maxRetries?: number;
  /** Context window. Default 30000. */
  numCtx?: number;
}

/**
 * The shipped Ollama ModelProvider. The host supplies selection, host URL and
 * credentials; everything else (wire format, streaming, chunk parsing) lives
 * here. Native `thinking` is mapped to thinking deltas; inline `<think>` tags
 * are left in the text for host-side splitting.
 */
export const ollama = (options: OllamaProviderOptions): ModelProvider => {
  const client = new Ollama({
    host: options.baseUrl,
    ...(options.headers ? { headers: options.headers } : {}),
  });
  return {
    name: `ollama:${options.model}`,
    stream: (request) => streamChat(client, options, request),
  };
};

async function* streamChat(
  client: Ollama,
  options: OllamaProviderOptions,
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> {
  const codec = new ToolNameCodec(request.tools);
  const params = buildParams(options, request, codec);
  const response = await openChat(
    client,
    params,
    options.maxRetries ?? 0,
    request.signal,
  );
  const abort = () => response.abort();
  if (request.signal?.aborted) {
    abort();
  } else {
    request.signal?.addEventListener('abort', abort, { once: true });
  }

  try {
    const stream = normalizeProviderStreamErrors(response, {
      stage: 'stream_consumption',
      signal: request.signal,
    });
    for await (const chunk of stream) {
      const converted = convertChunk(chunk, codec);
      if (converted) {
        yield converted;
      }
      if (chunk.done) break;
    }
  } finally {
    request.signal?.removeEventListener('abort', abort);
  }
}

async function openChat(
  client: Ollama,
  params: ChatRequest & { stream: true },
  maxRetries: number,
  signal: AbortSignal | undefined,
) {
  try {
    signal?.throwIfAborted();
    // ollama-js 0.6.3 cannot cancel an in-flight client.chat setup call yet
    // (https://github.com/ollama/ollama-js/pull/288; AYC-1018). ollama, ayunis,
    // and synaforce share this adapter; pre-call, backoff, and active-stream
    // aborts work.
    return await retry(() => client.chat(params), maxRetries, signal);
  } catch (error) {
    throw normalizeProviderError(error, {
      stage: 'stream_establishment',
      signal,
    });
  }
}

const buildParams = (
  options: OllamaProviderOptions,
  request: ProviderRequest,
  codec: ToolNameCodec,
): ChatRequest & { stream: true } => {
  const tools = request.tools.map((tool) => convertTool(tool, codec));
  return {
    model: options.model,
    messages: convertMessages(request.instructions, request.messages, codec),
    tools: tools.length > 0 ? tools : undefined,
    stream: true,
    options: { num_ctx: options.numCtx ?? DEFAULT_NUM_CTX },
  };
};

/**
 * Retries the initial request on transient failure with exponential backoff,
 * mirroring the pre-runtime handlers' retry behavior. Mid-stream failures are
 * not retried.
 */
async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  signal?: AbortSignal,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    signal?.throwIfAborted();
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt, undefined, { signal });
      }
    }
  }
  throw lastError;
}
