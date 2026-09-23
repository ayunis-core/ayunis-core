import type {
  ProviderErrorContext,
  ProviderUnavailableError,
} from 'src/common/errors/provider.errors';
import {
  ProviderConnectionError,
  ProviderRequestRejectedError,
  ProviderServerError,
  ProviderTimeoutError,
} from 'src/common/errors/provider.errors';

export type RuntimeModelErrorType =
  | 'provider_connection'
  | 'provider_timeout'
  | 'provider_server'
  | 'provider_rejected';

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
  error: ProviderUnavailableError,
  _idleMs?: number,
): RuntimeModelErrorDetails;
export function serializeRuntimeModelError(
  error: ProviderUnavailableError,
): RuntimeModelErrorDetails {
  return {
    hostError: {
      type: providerErrorType(error),
      context: { ...error.context },
    },
  };
}

export function reconstructRuntimeModelError(
  details: Readonly<Record<string, unknown>> | undefined,
): ProviderUnavailableError | undefined {
  const serialized = readSerializedError(details?.hostError);
  if (!serialized) return undefined;
  return reconstructProviderError(serialized);
}

function providerErrorType(
  error: ProviderUnavailableError,
): RuntimeModelErrorType {
  if (error instanceof ProviderConnectionError) return 'provider_connection';
  if (error instanceof ProviderTimeoutError) return 'provider_timeout';
  if (error instanceof ProviderRequestRejectedError) return 'provider_rejected';
  return 'provider_server';
}

function readSerializedError(
  value: unknown,
): SerializedRuntimeModelError | undefined {
  if (!isRecord(value) || !isRuntimeModelErrorType(value.type)) {
    return undefined;
  }
  if (!isRecord(value.context)) return undefined;
  return { type: value.type, context: value.context };
}

function reconstructProviderError(
  serialized: SerializedRuntimeModelError,
): ProviderUnavailableError {
  const context = toProviderContext(serialized.context);
  if (serialized.type === 'provider_connection') {
    return new ProviderConnectionError(context);
  }
  if (serialized.type === 'provider_timeout') {
    return new ProviderTimeoutError(context);
  }
  if (serialized.type === 'provider_rejected') {
    return new ProviderRequestRejectedError(context);
  }
  return new ProviderServerError(context);
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
    ...(typeof context.upstreamRequestId === 'string' && {
      upstreamRequestId: context.upstreamRequestId,
    }),
    ...(typeof context.retryAfterMs === 'number' && {
      retryAfterMs: context.retryAfterMs,
    }),
    ...providerLifecycleContext(context),
  };
}

function providerLifecycleContext(
  context: Readonly<Record<string, unknown>>,
): Pick<ProviderErrorContext, 'failureStage' | 'timeoutSource'> {
  const failureStage = context.failureStage;
  const timeoutSource = context.timeoutSource;
  return {
    ...((failureStage === 'stream_establishment' ||
      failureStage === 'stream_consumption') && { failureStage }),
    ...((timeoutSource === 'transport' ||
      timeoutSource === 'response_start' ||
      timeoutSource === 'whole_stream') && { timeoutSource }),
  };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRuntimeModelErrorType(
  value: unknown,
): value is RuntimeModelErrorType {
  return (
    typeof value === 'string' &&
    [
      'provider_connection',
      'provider_timeout',
      'provider_server',
      'provider_rejected',
    ].includes(value)
  );
}
