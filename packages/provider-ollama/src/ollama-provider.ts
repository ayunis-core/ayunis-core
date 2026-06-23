import { Ollama } from 'ollama';
import type { ChatRequest } from 'ollama';

import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
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
  /** Initial-request retry budget for transient failures. Default: 0. */
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
  const params = buildParams(options, request);
  const iterator = await retry(
    () => client.chat(params),
    options.maxRetries ?? 0,
  );
  if (request.signal) {
    if (request.signal.aborted) {
      iterator.abort();
    } else {
      request.signal.addEventListener('abort', () => iterator.abort(), {
        once: true,
      });
    }
  }
  for await (const chunk of iterator) {
    const converted = convertChunk(chunk);
    if (converted) {
      yield converted;
    }
    if (chunk.done) {
      break;
    }
  }
}

const buildParams = (
  options: OllamaProviderOptions,
  request: ProviderRequest,
): ChatRequest & { stream: true } => {
  const tools = request.tools.map(convertTool);
  return {
    model: options.model,
    messages: convertMessages(request.instructions, request.messages),
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
async function retry<T>(fn: () => Promise<T>, maxRetries: number): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** attempt);
      }
    }
  }
  throw lastError;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
