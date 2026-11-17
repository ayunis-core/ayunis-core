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
  for await (const event of withToolInputHeartbeats(
    normalizedStream,
    toolInputHeartbeatBudgetMs(maxTokens),
  )) {
    const chunk = convertChunk(event, codec);
    if (chunk) yield chunk;
  }
}

export const TOOL_INPUT_HEARTBEAT_INTERVAL_MS = 30_000;
const MIN_TOOL_INPUT_TOKENS_PER_SECOND = 10;

// Size the finite keepalive window for the entire configured output budget at
// a deliberately conservative decode rate. Any real upstream event starts a
// fresh window; a dead connection still becomes idle after the bounded wait.
export const toolInputHeartbeatBudgetMs = (maxTokens: number): number =>
  Math.ceil((maxTokens / MIN_TOOL_INPUT_TOKENS_PER_SECOND) * 1_000);
export const isToolInputHeartbeatOnTime = (
  heartbeatDeadline: number,
  now = Date.now(),
): boolean => now <= heartbeatDeadline;
const HEARTBEAT = Symbol('tool-input-heartbeat');

async function* withToolInputHeartbeats(
  events: AsyncIterable<AnthropicStreamEvent>,
  heartbeatBudgetMs: number,
): AsyncIterable<AnthropicStreamEvent> {
  const iterator = events[Symbol.asyncIterator]();
  const openToolBlocks = new Set<number>();
  let pending: Promise<IteratorResult<AnthropicStreamEvent>> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let heartbeatDeadline = 0;

  try {
    for (;;) {
      pending ??= iterator.next();
      const result = !mayHeartbeat(openToolBlocks, heartbeatDeadline)
        ? await pending
        : await Promise.race([
            pending,
            new Promise<typeof HEARTBEAT>((resolve) => {
              timer = setTimeout(() => {
                if (isToolInputHeartbeatOnTime(heartbeatDeadline)) {
                  resolve(HEARTBEAT);
                }
              }, TOOL_INPUT_HEARTBEAT_INTERVAL_MS);
            }),
          ]);
      if (timer) clearTimeout(timer);
      timer = undefined;
      if (result === HEARTBEAT) {
        yield { type: 'ping' };
        continue;
      }

      pending = undefined;
      if (result.done) return;
      trackOpenToolBlocks(result.value, openToolBlocks);
      heartbeatDeadline =
        openToolBlocks.size > 0 ? Date.now() + heartbeatBudgetMs : 0;
      yield result.value;
    }
  } finally {
    if (timer) clearTimeout(timer);
    await closeIterator(iterator, pending !== undefined);
  }
}

const closeIterator = async (
  iterator: AsyncIterator<AnthropicStreamEvent>,
  hasPendingRead: boolean,
): Promise<void> => {
  const cleanup = iterator.return?.();
  if (!cleanup) return;
  if (hasPendingRead) {
    void cleanup.catch(() => undefined);
    return;
  }
  await cleanup.catch(() => undefined);
};

const mayHeartbeat = (
  openToolBlocks: Set<number>,
  heartbeatDeadline: number,
): boolean =>
  openToolBlocks.size > 0 &&
  Date.now() + TOOL_INPUT_HEARTBEAT_INTERVAL_MS <= heartbeatDeadline;

const trackOpenToolBlocks = (
  event: AnthropicStreamEvent,
  openToolBlocks: Set<number>,
): void => {
  if (
    event.type === 'content_block_start' &&
    event.content_block.type === 'tool_use'
  ) {
    openToolBlocks.add(event.index);
  } else if (event.type === 'content_block_stop') {
    openToolBlocks.delete(event.index);
  } else if (event.type === 'message_stop') {
    openToolBlocks.clear();
  }
};

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
  // Keep Anthropic's buffered tool-input streaming so the server validates
  // each JSON parameter. The stream wrapper emits heartbeats while the server
  // buffers long tool values, without masking stalls outside tool input
  // (AYC-1863).
  tools: request.tools.map((tool) => convertTool(tool, codec)),
  // Anthropic rejects tool_choice when no tools are supplied, so only send it
  // alongside a non-empty tools array.
  ...(request.tools.length > 0 && request.toolChoice !== undefined
    ? { tool_choice: convertToolChoice(request.toolChoice, codec) }
    : {}),
  ...(thinksByDefault(model)
    ? { thinking: { type: 'adaptive', display: 'summarized' } }
    : {}),
  ...(supportsEffort(model) ? { output_config: { effort: 'medium' } } : {}),
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

// The API default is `high` on most models, which makes multi-turn tool runs
// slow in chat (AYC-1604); `medium` is already the default on Opus 5.5 and
// Haiku 5.5. Haiku 4.5, Sonnet 4.5 and older reject the field with a 400.
// Opus 4.5 is left out because Bedrock only accepts it there behind the
// `effort-2025-11-24` beta. Verified on Bedrock: Opus 4.6–5.5, Sonnet 4.6–5;
// on the Anthropic API: Sonnet 5.5, Haiku 5.5.
const EFFORT_MODEL =
  /claude-(?:(?:opus|sonnet|haiku|fable|mythos)-[5-9]|(?:opus|sonnet)-4-[6-9])(?!\d)/;

const supportsEffort = (model: string): boolean => EFFORT_MODEL.test(model);
