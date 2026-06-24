import { GoogleGenAI } from '@google/genai';
import type { GenerateContentResponse } from '@google/genai';

import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '@ayunis/inference';

import { convertChunk } from './convert-chunk';
import { buildConfig, convertMessages } from './convert-request';

export interface GeminiProviderOptions {
  apiKey: string;
  /** Gemini model id, e.g. 'gemini-2.5-pro'. */
  model: string;
  /**
   * Retries for the initial stream request on transient failure. The Gemini
   * SDK has no retry-budget config, so this is applied around stream
   * initiation only (not mid-stream). Default: SDK default (no retry).
   */
  maxRetries?: number;
}

const RETRY_BASE_DELAY_MS = 1000;

/**
 * The shipped Gemini ModelProvider. The host supplies selection and
 * credentials; everything else (wire format, streaming, chunk parsing) lives
 * here. Text, tool calls, finish reason and usage are mapped; Gemini's
 * `thoughtSignature` round-trips via provider metadata on text and tool-call
 * parts.
 */
export const gemini = (options: GeminiProviderOptions): ModelProvider => {
  const client = new GoogleGenAI({ apiKey: options.apiKey });
  return {
    name: `gemini:${options.model}`,
    stream: (request) =>
      streamChat(client, options.model, options.maxRetries ?? 0, request),
  };
};

async function* streamChat(
  client: GoogleGenAI,
  model: string,
  maxRetries: number,
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> {
  const stream = await openStream(client, model, maxRetries, request);
  for await (const chunk of stream) {
    const converted = convertChunk(chunk);
    if (converted) {
      yield converted;
    }
  }
}

/**
 * Opens the Gemini stream, retrying the initial request with exponential
 * backoff. Only stream initiation is retried — once chunks flow, a mid-stream
 * failure surfaces to the caller.
 */
const openStream = (
  client: GoogleGenAI,
  model: string,
  maxRetries: number,
  request: ProviderRequest,
): Promise<AsyncGenerator<GenerateContentResponse>> =>
  withRetry(
    () =>
      client.models.generateContentStream({
        model,
        contents: convertMessages(request.messages),
        config: {
          ...buildConfig({
            instructions: request.instructions,
            tools: request.tools,
            toolChoice: request.toolChoice,
          }),
          ...(request.signal ? { abortSignal: request.signal } : {}),
        },
      }),
    maxRetries,
  );

const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number,
): Promise<T> => {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      await delay(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
      attempt += 1;
    }
  }
};

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
