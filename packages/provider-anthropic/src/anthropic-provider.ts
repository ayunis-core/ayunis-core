import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsStreaming } from '@anthropic-ai/sdk/resources/messages';
import { Stream } from '@anthropic-ai/sdk/streaming';

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

import { classifyAnthropicRejection } from './classify-rejection';
import { convertChunk, type AnthropicStreamEvent } from './convert-chunk';
import {
  convertMessages,
  convertSystem,
  convertTool,
  convertToolChoice,
  markCacheBreakpoint,
} from './convert-request';

// Kept well below model maximums on purpose: Bedrock reserves
// input_tokens + max_tokens against the account's TPM quota when admitting a
// request, so an oversized budget triggers throttling long before real usage
// warrants it. Hosts needing longer outputs can pass `maxTokens` explicitly.
export const DEFAULT_MAX_TOKENS = 16_384;

// Bounds each connection attempt — the SDK aborts if the response hasn't
// started, and clears the timer once streaming begins, so long healthy
// streams are unaffected. Well below the SDK's 10-minute default so a
// stalled connection surfaces as a retryable error instead of hanging the
// caller. Hosts can override via `timeoutMs`.
export const DEFAULT_TIMEOUT_MS = 120_000;

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
  /** SDK retries are for direct non-streaming calls only. Streaming hosts must pass 0. */
  maxRetries?: number;
  /** Per-attempt timeout in ms until the response starts. Default: 120s. */
  timeoutMs?: number;
}

/**
 * The shipped Anthropic ModelProvider. The host supplies selection and
 * credentials; everything else (wire format, streaming, chunk parsing)
 * lives here.
 */
export const anthropic = (options: AnthropicProviderOptions): ModelProvider => {
  const client = new Anthropic({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
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
  const codec = new ToolNameCodec(request.tools);
  const params = buildParams(model, maxTokens, request, codec);
  const response = await openMessageStream(client, params, request.signal);
  const normalizedStream = normalizeProviderStreamErrors(readEvents(response), {
    stage: 'stream_consumption',
    signal: request.signal,
    classifyRejection: classifyAnthropicRejection,
  });
  for await (const event of normalizedStream) {
    const chunk = convertChunk(event, codec);
    if (chunk) yield chunk;
  }
}

const openMessageStream = async (
  client: AnthropicCompatibleClient,
  params: MessageCreateParamsStreaming,
  signal?: AbortSignal,
): Promise<Response> => {
  try {
    return await client.messages
      .create(params, signal ? { signal } : undefined)
      .asResponse();
  } catch (error) {
    throw normalizeProviderError(error, {
      stage: 'stream_establishment',
      signal,
      timeoutSource: 'response_start',
      classifyRejection: classifyAnthropicRejection,
    });
  }
};

const FORWARDED_EVENTS = new Set([
  'message_start',
  'message_delta',
  'message_stop',
  'content_block_start',
  'content_block_delta',
  'content_block_stop',
  'ping',
]);

// The SDK's own Stream drops `ping`, but during a thinking phase with
// `display` omitted (the default on current models) pings are the only
// traffic, so the raw events are read here to keep `ping` visible.
async function* readEvents(
  response: Response,
): AsyncIterable<AnthropicStreamEvent> {
  for await (const sse of Stream.rawEvents(response)) {
    if (sse.event === 'error') {
      const body = JSON.parse(sse.data) as StreamErrorBody;
      throw new Anthropic.APIError(
        undefined,
        body,
        undefined,
        response.headers,
        body.error?.type,
      );
    }
    if (sse.event && FORWARDED_EVENTS.has(sse.event)) {
      yield JSON.parse(sse.data) as AnthropicStreamEvent;
    }
  }
}

type StreamErrorBody = { error?: { type?: Anthropic.ErrorType } };

const buildParams = (
  model: string,
  maxTokens: number,
  request: ProviderRequest,
  codec: ToolNameCodec,
): MessageCreateParamsStreaming => ({
  model,
  // Two prompt-cache breakpoints: the system block (which also covers the
  // tool definitions rendered before it) and the conversation tail, so each
  // turn and agent-loop iteration reuses the previous request's cache.
  system: convertSystem(request.instructions),
  messages: markCacheBreakpoint(convertMessages(request.messages, codec)),
  tools: request.tools.map((tool) => convertTool(tool, codec)),
  // Anthropic rejects tool_choice when no tools are supplied, so only send it
  // alongside a non-empty tools array.
  ...(request.tools.length > 0 && request.toolChoice !== undefined
    ? { tool_choice: convertToolChoice(request.toolChoice, codec) }
    : {}),
  ...(thinksByDefault(model)
    ? { thinking: { type: 'adaptive', display: 'summarized' } }
    : {}),
  max_tokens: maxTokens,
  stream: true,
});

// These models always think, but omit the thinking text by default, so a chat
// shows nothing until the answer starts (AYC-1374). Summarized display streams
// the reasoning instead without changing how much the model thinks. Older
// models are excluded: sending `adaptive` would switch thinking on for them.
// ponytail: verified families only; extend the pattern once another
// default-thinking family (e.g. Haiku 5.5) is verified to accept `display`.
const DEFAULT_THINKING_MODEL = /claude-(?:opus|sonnet)-5(?:-\d+)?(?!\d)/;

const thinksByDefault = (model: string): boolean =>
  DEFAULT_THINKING_MODEL.test(model);
