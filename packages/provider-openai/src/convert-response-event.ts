import type {
  Response,
  ResponseReasoningItem,
  ResponseStreamEvent,
  ResponseUsage,
} from 'openai/resources/responses/responses';

import type {
  FinishReason,
  ProviderChunk,
  ToolNameCodec,
} from '@ayunis/inference';

export interface ResponseConversionState {
  reasoningItems: ResponseReasoningItem[];
}

export const createResponseConversionState = (): ResponseConversionState => ({
  reasoningItems: [],
});

export const convertResponseEvent = (
  event: ResponseStreamEvent,
  codec: ToolNameCodec,
  state: ResponseConversionState = createResponseConversionState(),
): ProviderChunk | null => {
  const delta = convertDeltaEvent(event);
  if (delta) return delta;
  if (event.type === 'response.output_item.done') {
    captureReasoningItem(event.item, state);
    return null;
  }
  if (event.type === 'response.output_item.added') {
    return convertOutputItem(event.item, event.output_index, codec, state);
  }
  return convertTerminalEvent(event, state);
};

const convertTerminalEvent = (
  event: ResponseStreamEvent,
  state: ResponseConversionState,
): ProviderChunk | null => {
  // Lifecycle-only events intentionally carry no provider-facing output.
  // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
  switch (event.type) {
    case 'response.completed':
      return attachPendingReasoning(
        convertTerminalResponse(event.response, false),
        state,
      );
    case 'response.incomplete':
      return attachPendingReasoning(
        convertTerminalResponse(event.response, true),
        state,
      );
    case 'response.failed':
      throw new ResponseStreamError(
        event.response.error?.message ?? 'Azure Responses request failed',
        event.response.error?.code ?? null,
        null,
      );
    case 'error':
      throw new ResponseStreamError(event.message, event.code, event.param);
    default:
      return null;
  }
};

const convertDeltaEvent = (
  event: ResponseStreamEvent,
): ProviderChunk | null => {
  if (
    event.type === 'response.output_text.delta' ||
    event.type === 'response.refusal.delta'
  ) {
    return { textDelta: event.delta };
  }
  if (event.type !== 'response.function_call_arguments.delta') return null;
  return {
    toolCallDeltas: [
      {
        index: event.output_index,
        id: null,
        name: null,
        argumentsDelta: event.delta,
      },
    ],
  };
};

const attachPendingReasoning = (
  chunk: ProviderChunk,
  state: ResponseConversionState,
): ProviderChunk => {
  const reasoningItems = state.reasoningItems.splice(0);
  return reasoningItems.length > 0
    ? {
        ...chunk,
        textProviderMetadata: { openaiReasoning: reasoningItems },
      }
    : chunk;
};

const captureReasoningItem = (
  item: Response['output'][number],
  state: ResponseConversionState,
): void => {
  if (item.type !== 'reasoning' || !item.encrypted_content) return;
  state.reasoningItems.push({
    id: item.id,
    type: 'reasoning',
    summary: [],
    encrypted_content: item.encrypted_content,
    status: item.status,
  });
};

const convertOutputItem = (
  item: Response['output'][number],
  index: number,
  codec: ToolNameCodec,
  state: ResponseConversionState,
): ProviderChunk | null => {
  if (item.type !== 'function_call') return null;
  const name = codec.decode(item.name);
  const reasoningItems = state.reasoningItems.splice(0);
  const providerMetadata = {
    ...(name !== item.name ? { wireName: item.name } : {}),
    ...(reasoningItems.length > 0 ? { openaiReasoning: reasoningItems } : {}),
  };
  return {
    toolCallDeltas: [
      {
        index,
        id: item.call_id,
        name,
        argumentsDelta: null,
        ...(Object.keys(providerMetadata).length > 0
          ? { providerMetadata }
          : {}),
      },
    ],
  };
};

const convertTerminalResponse = (
  response: Response,
  incomplete: boolean,
): ProviderChunk => ({
  finishReason: mapFinishReason(response, incomplete),
  ...(response.usage ? { usage: convertUsage(response.usage) } : {}),
});

const mapFinishReason = (
  response: Response,
  incomplete: boolean,
): FinishReason => {
  if (incomplete) {
    const hasToolCall = response.output.some(
      (item) => item.type === 'function_call',
    );
    const reason = response.incomplete_details?.reason;
    return hasToolCall ||
      reason === 'max_output_tokens' ||
      reason === 'max_messages'
      ? 'length'
      : 'stop';
  }
  return response.output.some((item) => item.type === 'function_call')
    ? 'tool_calls'
    : 'stop';
};

const convertUsage = (usage: ResponseUsage) => ({
  inputTokens: usage.input_tokens,
  outputTokens: usage.output_tokens,
});

class ResponseStreamError extends Error {
  readonly code: string | null;
  readonly status: number | undefined;
  readonly param: string | null;

  constructor(message: string, code: string | null, param: string | null) {
    super(message);
    this.name = 'ResponseStreamError';
    this.code = code;
    this.status = mapErrorStatus(code);
    this.param = param;
  }
}

const RATE_LIMIT_CODES = new Set([
  'no_capacity',
  'rate_limit_exceeded',
  'too_many_requests',
]);

const CLIENT_ERROR_CODES = new Set([
  'bio_policy',
  'data_residency_mismatch',
  'empty_image_file',
  'failed_to_download_image',
  'image_content_policy_violation',
  'image_file_not_found',
  'image_file_too_large',
  'image_parse_error',
  'image_too_large',
  'image_too_small',
  'misalignment_policy_violation',
  'unsupported_image_media_type',
  'user_error',
]);

const mapErrorStatus = (code: string | null): number | undefined => {
  if (!code) return undefined;
  if (RATE_LIMIT_CODES.has(code)) return 429;
  if (CLIENT_ERROR_CODES.has(code) || code.startsWith('invalid_')) return 400;
  if (code === 'server_error' || code === 'vector_store_timeout') return 500;
  if (code === 'forbidden') return 403;
  return undefined;
};
