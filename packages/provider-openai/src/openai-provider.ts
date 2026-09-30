import OpenAI from 'openai';
import type { ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions';
import type { ResponseCreateParamsStreaming } from 'openai/resources/responses/responses';

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
import {
  convertResponseEvent,
  createResponseConversionState,
} from './convert-response-event';
import {
  convertResponseInput,
  convertResponseTool,
  convertResponseToolChoice,
} from './convert-response-request';
import {
  convertMessages,
  convertTool,
  convertToolChoice,
} from './convert-request';

// Bounds each connection attempt — the SDK aborts if the response hasn't
// started, and clears the timer once streaming begins, so long healthy
// streams are unaffected. Well below the SDK's 10-minute default so a
// stalled connection surfaces as a retryable error instead of hanging the
// caller. Hosts can override via `timeoutMs`.
export const DEFAULT_TIMEOUT_MS = 120_000;

export interface OpenAIProviderOptions {
  apiKey: string;
  /** OpenAI model id, e.g. 'gpt-4.1'. */
  model: string;
  baseUrl?: string;
  /** SDK retries are for direct non-streaming calls only. Streaming hosts must pass 0. */
  maxRetries?: number;
  /** Per-attempt timeout in ms until the response starts. Default: 120s. */
  timeoutMs?: number;
}

export interface AzureProviderOptions {
  apiKey: string;
  /** Azure resource endpoint, e.g. 'https://my-resource.openai.azure.com'. */
  endpoint: string;
  /** Azure deployment name, passed through as the model id. */
  model: string;
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh';
  /** SDK retries are for direct non-streaming calls only. Streaming hosts must pass 0. */
  maxRetries?: number;
  /** Per-attempt timeout in ms until the response starts. Default: 120s. */
  timeoutMs?: number;
}

/**
 * A minimal OpenAI Chat Completions ModelProvider. The host supplies
 * selection and credentials. Text, tool calls, finish reason and usage are
 * mapped; reasoning/thinking deltas are out of scope for this provider.
 */
export const openai = (options: OpenAIProviderOptions): ModelProvider => {
  const client = new OpenAI({
    apiKey: options.apiKey,
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    ...(options.baseUrl ? { baseURL: options.baseUrl } : {}),
    ...(options.maxRetries !== undefined
      ? { maxRetries: options.maxRetries }
      : {}),
  });
  return createProvider(client, `openai:${options.model}`, options.model);
};

const buildAzureV1BaseUrl = (endpoint: string): string => {
  let url: URL;
  try {
    url = new URL(endpoint.trim());
  } catch {
    throw new Error(
      `Azure OpenAI endpoint must be an absolute HTTPS URL; received ${JSON.stringify(endpoint)}`,
    );
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      `Azure OpenAI endpoint must be an absolute HTTPS URL without credentials, query parameters, or a fragment; received ${JSON.stringify(endpoint)}`,
    );
  }
  let pathname = url.pathname;
  while (pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }
  url.pathname = `${pathname}/openai/v1/`;
  return url.toString();
};

/**
 * Azure OpenAI ModelProvider using the versionless v1 Responses API.
 * Responses are never stored; conversation state remains host-managed.
 */
export const azure = (options: AzureProviderOptions): ModelProvider => {
  const client = new OpenAI({
    apiKey: options.apiKey,
    baseURL: buildAzureV1BaseUrl(options.endpoint),
    timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    ...(options.maxRetries !== undefined
      ? { maxRetries: options.maxRetries }
      : {}),
  });
  return createResponsesProvider(client, options);
};

const createResponsesProvider = (
  client: OpenAI,
  options: AzureProviderOptions,
): ModelProvider => ({
  name: `azure:${options.model}`,
  stream: (request) =>
    streamResponses(client, options.model, options.reasoningEffort, request),
});

const createProvider = (
  client: OpenAI,
  name: string,
  model: string,
): ModelProvider => ({
  name,
  stream: (request) => streamChat(client, model, request),
});

async function* streamChat(
  client: OpenAI,
  model: string,
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> {
  const codec = new ToolNameCodec(request.tools);
  const params = buildParams(model, request, codec);
  const stream = await createChatStream(client, params, request.signal);
  // With stream_options.include_usage the wire order is:
  //   content… → finish_reason chunk → usage chunk → [DONE] → connection close.
  // Once we have both the finish reason and the usage, the caller has
  // everything it needs. Stop here instead of draining to [DONE]: reading
  // through the connection teardown is what some egress proxies cut or
  // idle-time-out, which the OpenAI SDK surfaces as a spurious
  // APIConnectionError *after* an otherwise complete response. Breaking early
  // closes the stream from our side and avoids that tail entirely.
  let sawFinishReason = false;
  const normalizedStream = normalizeProviderStreamErrors(stream, {
    stage: 'stream_consumption',
    signal: request.signal,
  });
  for await (const chunk of normalizedStream) {
    // Track the finish from the *raw* chunk, not the mapped ProviderChunk:
    // convertChunk maps unrecognized finish reasons to `null`, so keying off
    // the mapped value would miss a genuine finish and never break.
    if (chunk.choices.at(0)?.finish_reason) sawFinishReason = true;
    const converted = convertChunk(chunk, codec);
    if (!converted) continue;
    yield converted;
    if (sawFinishReason && converted.usage) return;
  }
}

async function* streamResponses(
  client: OpenAI,
  model: string,
  reasoningEffort: AzureProviderOptions['reasoningEffort'],
  request: ProviderRequest,
): AsyncIterable<ProviderChunk> {
  const codec = new ToolNameCodec(request.tools);
  const params = buildResponseParams(model, reasoningEffort, request, codec);
  const stream = await createResponsesStream(client, params, request.signal);
  const conversionState = createResponseConversionState();
  const normalizedStream = normalizeProviderStreamErrors(stream, {
    stage: 'stream_consumption',
    signal: request.signal,
  });
  for await (const event of normalizedStream) {
    const converted = convertResponseEvent(event, codec, conversionState);
    if (converted) yield converted;
    if (
      event.type === 'response.completed' ||
      event.type === 'response.incomplete'
    ) {
      return;
    }
  }
}

const createChatStream = async (
  client: OpenAI,
  params: ChatCompletionCreateParamsStreaming,
  signal?: AbortSignal,
) => {
  try {
    return await client.chat.completions.create(
      params,
      signal ? { signal } : undefined,
    );
  } catch (error) {
    throw normalizeProviderError(error, {
      stage: 'stream_establishment',
      signal,
      timeoutSource: 'response_start',
    });
  }
};

const createResponsesStream = async (
  client: OpenAI,
  params: ResponseCreateParamsStreaming,
  signal?: AbortSignal,
) => {
  try {
    return await client.responses.create(
      params,
      signal ? { signal } : undefined,
    );
  } catch (error) {
    throw normalizeProviderError(error, {
      stage: 'stream_establishment',
      signal,
      timeoutSource: 'response_start',
    });
  }
};

const buildResponseParams = (
  model: string,
  reasoningEffort: AzureProviderOptions['reasoningEffort'],
  request: ProviderRequest,
  codec: ToolNameCodec,
): ResponseCreateParamsStreaming => {
  const hasTools = request.tools.length > 0;
  return {
    model,
    instructions: request.instructions,
    input: convertResponseInput(request.messages, codec),
    ...(hasTools
      ? { tools: request.tools.map((tool) => convertResponseTool(tool, codec)) }
      : {}),
    ...(hasTools && request.toolChoice !== undefined
      ? {
          tool_choice: convertResponseToolChoice(request.toolChoice, codec),
        }
      : {}),
    ...(reasoningEffort
      ? {
          reasoning: { effort: reasoningEffort },
          include: ['reasoning.encrypted_content' as const],
        }
      : {}),
    store: false,
    stream: true,
  };
};

const buildParams = (
  model: string,
  request: ProviderRequest,
  codec: ToolNameCodec,
): ChatCompletionCreateParamsStreaming => {
  const hasTools = request.tools.length > 0;
  return {
    model,
    messages: convertMessages(request.instructions, request.messages, codec),
    ...(hasTools
      ? { tools: request.tools.map((tool) => convertTool(tool, codec)) }
      : {}),
    ...(hasTools && request.toolChoice !== undefined
      ? { tool_choice: convertToolChoice(request.toolChoice, codec) }
      : {}),
    stream: true,
    stream_options: { include_usage: true },
  };
};
