import type { ProviderErrorContext } from 'src/common/errors/provider.errors';
import { ProviderErrorReason } from 'src/common/errors/extract-provider-error-diagnostics.helper';
import {
  ProviderConnectionError,
  ProviderRequestRejectedError,
  ProviderServerError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from 'src/common/errors/provider.errors';
import {
  AnonymizationPostDetectionError,
  isAnonymizationCauseType,
} from 'src/common/anonymization/application/anonymization.errors';
import {
  ThreadPiiMaskAnonymizationError,
  type ThreadPiiMaskAnonymizationStage,
} from 'src/domain/thread-pii-masks/application/thread-pii-masks.errors';
import type { ApplicationError } from 'src/common/errors/base.error';

export type RuntimeModelErrorType =
  | 'provider_connection'
  | 'provider_timeout'
  | 'provider_server'
  | 'provider_rejected';

type AnonymizationHostErrorType =
  'thread_pii_mask_failure' | 'anonymization_post_detection_failure';

type RuntimeHostErrorType = RuntimeModelErrorType | AnonymizationHostErrorType;

export interface SerializedRuntimeHostError {
  readonly type: RuntimeHostErrorType;
  readonly context: Readonly<Record<string, unknown>>;
}

export interface RuntimeHostErrorDetails extends Readonly<
  Record<string, unknown>
> {
  readonly hostError: SerializedRuntimeHostError;
}

export function serializeRuntimeModelError(
  error: ProviderUnavailableError,
  _idleMs?: number,
): RuntimeHostErrorDetails;
export function serializeRuntimeModelError(
  error: ProviderUnavailableError,
): RuntimeHostErrorDetails {
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

export function serializeRuntimeAnonymizationError(
  error: unknown,
): RuntimeHostErrorDetails | undefined {
  if (error instanceof ProviderUnavailableError) {
    return serializeRuntimeModelError(error);
  }
  if (error instanceof ThreadPiiMaskAnonymizationError) {
    return serializedHostError('thread_pii_mask_failure', {
      code: error.code,
      stage: error.stage,
      ...safeAnonymizationMetadata(error.metadata),
    });
  }
  if (error instanceof AnonymizationPostDetectionError) {
    return serializedHostError('anonymization_post_detection_failure', {
      code: error.code,
      stage: error.stage,
      ...safeAnonymizationMetadata(error.metadata),
    });
  }
  return undefined;
}

export function reconstructRuntimeAnonymizationError(
  details: Readonly<Record<string, unknown>> | undefined,
): ApplicationError | undefined {
  const providerError = reconstructRuntimeModelError(details);
  if (providerError) return providerError;
  const serialized = readAnonymizationHostError(details?.hostError);
  if (!serialized) return undefined;
  const metadata = safeAnonymizationMetadata(serialized.context);
  if (
    serialized.type === 'thread_pii_mask_failure' &&
    isThreadPiiMaskStage(serialized.context.stage)
  ) {
    return new ThreadPiiMaskAnonymizationError(
      serialized.context.stage,
      metadata,
      undefined,
    );
  }
  if (
    serialized.type === 'anonymization_post_detection_failure' &&
    (serialized.context.stage === 'whitelist_filter' ||
      serialized.context.stage === 'mask_application')
  ) {
    return new AnonymizationPostDetectionError(
      serialized.context.stage,
      readCount(metadata.textLength),
      readCount(metadata.detectionCount),
      readCauseType(metadata.causeType),
    );
  }
  return undefined;
}

function serializedHostError(
  type: AnonymizationHostErrorType,
  context: Readonly<Record<string, unknown>>,
): RuntimeHostErrorDetails {
  return { hostError: { type, context } };
}

function readAnonymizationHostError(value: unknown):
  | {
      type: AnonymizationHostErrorType;
      context: Readonly<Record<string, unknown>>;
    }
  | undefined {
  if (!isRecord(value) || !isRecord(value.context)) return undefined;
  if (
    value.type !== 'thread_pii_mask_failure' &&
    value.type !== 'anonymization_post_detection_failure'
  ) {
    return undefined;
  }
  return { type: value.type, context: value.context };
}

function safeAnonymizationMetadata(
  metadata: Readonly<Record<string, unknown>> | undefined,
): Readonly<Record<string, unknown>> {
  if (!metadata) return {};
  return {
    ...pickCount(metadata, 'textLength'),
    ...pickCount(metadata, 'detectionCount'),
    ...pickCount(metadata, 'existingMaskCount'),
    ...pickCount(metadata, 'newMaskCount'),
    ...pickIdentifier(metadata, 'databaseCode'),
    ...pickIdentifier(metadata, 'databaseConstraint'),
    ...pickCauseType(metadata),
  };
}

function pickCauseType(
  source: Readonly<Record<string, unknown>>,
): Readonly<Record<string, string>> {
  return isAnonymizationCauseType(source.causeType)
    ? { causeType: source.causeType }
    : {};
}

function pickCount(
  source: Readonly<Record<string, unknown>>,
  key: string,
): Readonly<Record<string, number>> {
  const value = source[key];
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
    ? { [key]: value }
    : {};
}

function pickIdentifier(
  source: Readonly<Record<string, unknown>>,
  key: string,
): Readonly<Record<string, string>> {
  const value = source[key];
  return typeof value === 'string' && /^[A-Za-z0-9_.-]{1,128}$/.test(value)
    ? { [key]: value }
    : {};
}

function readCount(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function readCauseType(value: unknown) {
  return isAnonymizationCauseType(value) ? value : undefined;
}

function isThreadPiiMaskStage(
  value: unknown,
): value is ThreadPiiMaskAnonymizationStage {
  return (
    typeof value === 'string' &&
    [
      'org_whitelist_lookup',
      'global_whitelist_lookup',
      'existing_masks_lookup',
      'new_masks_build',
      'new_masks_persistence',
    ].includes(value)
  );
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
): SerializedProviderError | undefined {
  if (!isRecord(value) || !isRuntimeModelErrorType(value.type)) {
    return undefined;
  }
  if (!isRecord(value.context)) return undefined;
  return { type: value.type, context: value.context };
}

function reconstructProviderError(
  serialized: SerializedProviderError,
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

interface SerializedProviderError {
  readonly type: RuntimeModelErrorType;
  readonly context: Readonly<Record<string, unknown>>;
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
    ...readProviderDiagnostics(context),
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

function readProviderDiagnostics(
  context: Readonly<Record<string, unknown>>,
): Pick<
  ProviderErrorContext,
  'upstreamCode' | 'upstreamType' | 'upstreamParam' | 'upstreamReason'
> {
  return {
    ...(typeof context.upstreamCode === 'string' && {
      upstreamCode: context.upstreamCode,
    }),
    ...(typeof context.upstreamType === 'string' && {
      upstreamType: context.upstreamType,
    }),
    ...(typeof context.upstreamParam === 'string' && {
      upstreamParam: context.upstreamParam,
    }),
    ...(isProviderErrorReason(context.upstreamReason) && {
      upstreamReason: context.upstreamReason,
    }),
  };
}

const PROVIDER_ERROR_REASONS: ReadonlySet<string> = new Set(
  Object.values(ProviderErrorReason),
);

function isProviderErrorReason(
  value: unknown,
): value is ProviderErrorContext['upstreamReason'] {
  return typeof value === 'string' && PROVIDER_ERROR_REASONS.has(value);
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
