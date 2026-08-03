import type { ErrorMetadata } from 'src/common/errors/base.error';
import type { ProviderErrorContext } from 'src/common/errors/provider.errors';
import {
  ProviderConnectionError,
  ProviderServerError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from 'src/common/errors/provider.errors';
import {
  InferenceAbortedError,
  InferenceFailedError,
  InferenceImageTooLargeError,
  InferenceStreamStalledError,
} from 'src/domain/models/application/models.errors';

export type RuntimeModelErrorType =
  | 'provider_connection'
  | 'provider_timeout'
  | 'provider_server'
  | 'inference_aborted'
  | 'inference_image_too_large'
  | 'inference_stream_stalled'
  | 'inference_failed';

export interface SerializedRuntimeModelError {
  readonly type: RuntimeModelErrorType;
  readonly context: Readonly<Record<string, unknown>>;
}

export interface RuntimeModelErrorDetails extends Readonly<
  Record<string, unknown>
> {
  readonly hostError: SerializedRuntimeModelError;
}

export function serializeRuntimeModelError(
  error: Error,
  idleMs: number,
): RuntimeModelErrorDetails {
  return {
    hostError: serializeError(error, idleMs),
  };
}

export function reconstructRuntimeModelError(
  details: Readonly<Record<string, unknown>> | undefined,
): Error | undefined {
  const serialized = readSerializedError(details?.hostError);
  if (!serialized) return undefined;
  return reconstructError(serialized);
}

function serializeError(
  error: Error,
  idleMs: number,
): SerializedRuntimeModelError {
  if (error instanceof ProviderUnavailableError) {
    return serializeProviderError(error);
  }
  if (error instanceof InferenceStreamStalledError) {
    return { type: 'inference_stream_stalled', context: { idleMs } };
  }
  if (error instanceof InferenceImageTooLargeError) {
    return { type: 'inference_image_too_large', context: error.metadata ?? {} };
  }
  if (error instanceof InferenceAbortedError) {
    return { type: 'inference_aborted', context: error.metadata ?? {} };
  }
  const reason = error.message.replace(/^Inference failed: /, '');
  const metadata = error instanceof InferenceFailedError ? error.metadata : {};
  return { type: 'inference_failed', context: { reason, ...metadata } };
}

function serializeProviderError(
  error: ProviderUnavailableError,
): SerializedRuntimeModelError {
  const type = providerErrorType(error);
  const causeMessage = error.metadata?.causeMessage;
  return {
    type,
    context: {
      ...error.context,
      ...(typeof causeMessage === 'string' ? { causeMessage } : {}),
    },
  };
}

function providerErrorType(
  error: ProviderUnavailableError,
): RuntimeModelErrorType {
  if (error instanceof ProviderConnectionError) return 'provider_connection';
  if (error instanceof ProviderTimeoutError) return 'provider_timeout';
  return 'provider_server';
}

function readSerializedError(
  value: unknown,
): SerializedRuntimeModelError | undefined {
  if (!isRecord(value) || typeof value.type !== 'string') return undefined;
  if (!isRuntimeModelErrorType(value.type) || !isRecord(value.context)) {
    return undefined;
  }
  return { type: value.type, context: value.context };
}

function reconstructError(serialized: SerializedRuntimeModelError): Error {
  if (serialized.type.startsWith('provider_')) {
    return reconstructProviderError(serialized);
  }
  const context = serialized.context;
  if (serialized.type === 'inference_stream_stalled') {
    const idleMs = typeof context.idleMs === 'number' ? context.idleMs : 0;
    return new InferenceStreamStalledError(idleMs);
  }
  if (serialized.type === 'inference_image_too_large') {
    return new InferenceImageTooLargeError(context);
  }
  if (serialized.type === 'inference_aborted') {
    return new InferenceAbortedError(context);
  }
  const reason =
    typeof context.reason === 'string'
      ? context.reason
      : 'Provider inference failed';
  return new InferenceFailedError(reason, withoutKey(context, 'reason'));
}

function reconstructProviderError(
  serialized: SerializedRuntimeModelError,
): Error {
  const context = toProviderContext(serialized.context);
  const causeMessage = serialized.context.causeMessage;
  const cause =
    typeof causeMessage === 'string' ? new Error(causeMessage) : undefined;
  if (serialized.type === 'provider_connection') {
    return new ProviderConnectionError(context, cause);
  }
  if (serialized.type === 'provider_timeout') {
    return new ProviderTimeoutError(context, cause);
  }
  return new ProviderServerError(context, cause);
}

function toProviderContext(
  context: Readonly<Record<string, unknown>>,
): ProviderErrorContext {
  return {
    provider:
      typeof context.provider === 'string' ? context.provider : 'unknown',
    ...(typeof context.modelId === 'string' && { modelId: context.modelId }),
    ...(typeof context.host === 'string' && { host: context.host }),
    ...(typeof context.underlyingCode === 'string' && {
      underlyingCode: context.underlyingCode,
    }),
    ...(typeof context.upstreamStatus === 'number' && {
      upstreamStatus: context.upstreamStatus,
    }),
  };
}

function withoutKey(
  context: Readonly<Record<string, unknown>>,
  key: string,
): ErrorMetadata {
  return Object.fromEntries(
    Object.entries(context).filter(([entryKey]) => entryKey !== key),
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRuntimeModelErrorType(
  value: string,
): value is RuntimeModelErrorType {
  return [
    'provider_connection',
    'provider_timeout',
    'provider_server',
    'inference_aborted',
    'inference_image_too_large',
    'inference_stream_stalled',
    'inference_failed',
  ].includes(value);
}
