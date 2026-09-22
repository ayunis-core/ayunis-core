import { setTimeout as delay } from 'node:timers/promises';

import { GoogleGenAI } from '@google/genai';
import type {
  GenerateContentParameters,
  GenerateContentResponse,
} from '@google/genai';

import type {
  ModelProvider,
  ProviderChunk,
  ProviderRequest,
} from '@ayunis/inference';
import {
  normalizeProviderError,
  normalizeProviderStreamErrors,
  ToolNameCodec,
} from '@ayunis/inference';

import { convertChunk } from './convert-chunk';
import { buildConfig, convertMessages } from './convert-request';

export interface GeminiProviderOptions {
  apiKey: string;
  /** Gemini model id, e.g. 'gemini-2.5-pro'. */
  model: string;
  /**
   * Initial-request retries for direct non-streaming adapter instances. Agent
   * and direct-streaming callers must use 0 so one invocation opens exactly
   * one SDK stream. Mid-stream failures are never retried. Default: 0.
   */
  maxRetries?: number;
}

const RETRY_BASE_DELAY_MS = 1000;

/**
 * The shipped Gemini ModelProvider. The host supplies selection and
 * credentials; everything else (wire format, streaming, chunk parsing) lives
 * here. Text, tool calls, finish reason and usage are mapped; Gemini's
 * `thoughtSignature` round-trips via provider metadata on text and tool-call
 * parts. This adapter adds no package deadline; the host signal is forwarded
 * to stream setup and consumption.
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
  const codec = new ToolNameCodec(request.tools);
  const contents = convertMessages(request.messages, codec);
  const config = {
    ...buildConfig({
      instructions: request.instructions,
      tools: request.tools,
      toolChoice: request.toolChoice,
      codec,
    }),
    ...(request.signal ? { abortSignal: request.signal } : {}),
  };
  const stream = await openStream(
    client,
    model,
    contents,
    config,
    maxRetries,
    request.signal,
  );
  for await (const chunk of normalizeProviderStreamErrors(stream, {
    stage: 'stream_consumption',
    signal: request.signal,
  })) {
    const converted = convertChunk(chunk, codec);
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
const openStream = async (
  client: GoogleGenAI,
  model: string,
  contents: GenerateContentParameters['contents'],
  config: GenerateContentParameters['config'],
  maxRetries: number,
  signal: AbortSignal | undefined,
): Promise<AsyncGenerator<GenerateContentResponse>> => {
  try {
    return await withRetry(
      () => client.models.generateContentStream({ model, contents, config }),
      maxRetries,
      signal,
    );
  } catch (error) {
    throw normalizeProviderError(error, {
      stage: 'stream_establishment',
      signal,
    });
  }
};

const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number,
  signal: AbortSignal | undefined,
): Promise<T> => {
  let attempt = 0;
  for (;;) {
    signal?.throwIfAborted();
    try {
      return await fn();
    } catch (error) {
      if (attempt >= maxRetries) {
        throw error;
      }
      await delay(RETRY_BASE_DELAY_MS * 2 ** attempt, undefined, { signal });
      attempt += 1;
    }
  }
};
