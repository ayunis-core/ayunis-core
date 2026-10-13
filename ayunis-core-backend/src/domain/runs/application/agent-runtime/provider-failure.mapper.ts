import type { ProviderFailureFacts, RunEvent } from '@ayunis/agent-runtime';
import type { ProviderRejectionReason } from '@ayunis/inference';
import type {
  ApplicationError,
  ErrorMetadata,
} from 'src/common/errors/base.error';
import { findPortableProviderError } from 'src/common/errors/find-portable-provider-error.helper';
import {
  extractProviderErrorDiagnostics,
  hasRateLimitDiagnostics,
  ProviderErrorReason,
  type ProviderErrorDiagnostics,
} from 'src/common/errors/extract-provider-error-diagnostics.helper';
import {
  ProviderConnectionError,
  ProviderRequestRejectedError,
  ProviderServerError,
  ProviderTimeoutError,
  type ProviderErrorContext,
} from 'src/common/errors/provider.errors';
import {
  InferenceAbortedError,
  InferenceFailedError,
  InferenceStreamStalledError,
  InferenceImageTooLargeError,
} from 'src/domain/models/application/models.errors';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { RunContextBudgetExceededError } from 'src/domain/runs/application/runs.errors';
import type { RuntimeModelRegistry } from './runtime-model.registry';

type RunErrorEvent = Extract<RunEvent, { type: 'error' }>;

export function mapPortableProviderError(
  event: RunErrorEvent,
  models: RuntimeModelRegistry | undefined,
): ApplicationError | undefined {
  if (
    event.code !== 'PROVIDER_FAILED' ||
    !event.providerFailure ||
    !event.modelCall ||
    !models
  ) {
    return undefined;
  }
  const providerFailure = event.providerFailure;
  const modelCall = event.modelCall;
  let model: LanguageModel;
  try {
    model = models.resolveByProviderName(modelCall.provider);
  } catch {
    return undefined;
  }
  return mapResolvedProviderError(
    event,
    models,
    model,
    providerFailure,
    modelCall.modelCallId,
  );
}

function mapResolvedProviderError(
  event: RunErrorEvent,
  models: RuntimeModelRegistry,
  model: LanguageModel,
  providerFailure: ProviderFailureFacts,
  modelCallId: string,
): ApplicationError {
  const callError = models.getCallError(modelCallId);
  const diagnostics = collectProviderErrorDiagnostics(callError);
  const failure = classifyKnownRateLimit(providerFailure, diagnostics);
  const context = providerErrorContext(
    model.provider,
    model.name,
    failure,
    diagnostics,
  );
  if (isRuntimeIdleStall(event, failure)) {
    return new InferenceStreamStalledError(
      readIdleMs(event.message),
      providerFailureMetadata(failure, context),
    );
  }
  if (
    failure.kind === 'rejection' &&
    diagnostics.upstreamReason === ProviderErrorReason.CONTEXT_LENGTH_EXCEEDED
  ) {
    return new RunContextBudgetExceededError({
      provider: context.provider,
      modelId: context.modelId,
      status: failure.upstreamStatus,
      upstreamRequestId: failure.upstreamRequestId,
    });
  }
  if (hasRejectionReason(callError, 'image_too_large')) {
    return new InferenceImageTooLargeError({
      provider: context.provider,
      modelId: context.modelId,
      status: failure.upstreamStatus,
      upstreamRequestId: failure.upstreamRequestId,
    });
  }
  return mapProviderFailure(failure, context, diagnostics);
}

function mapProviderFailure(
  failure: ProviderFailureFacts,
  context: ProviderErrorContext,
  diagnostics: ProviderErrorDiagnostics,
): ApplicationError {
  if (failure.kind === 'connection') {
    return new ProviderConnectionError(context);
  }
  if (failure.kind === 'timeout') return new ProviderTimeoutError(context);
  if (failure.kind === 'server') return new ProviderServerError(context);
  if (failure.kind === 'rate_limit') {
    return new ProviderRequestRejectedError(context);
  }
  if (failure.kind === 'abort') {
    return new InferenceAbortedError(providerFailureMetadata(failure, context));
  }
  return new InferenceFailedError('Provider inference failed', {
    ...providerFailureMetadata(failure, context),
    ...diagnostics,
  });
}

function classifyKnownRateLimit(
  failure: ProviderFailureFacts,
  diagnostics: ProviderErrorDiagnostics,
): ProviderFailureFacts {
  if (failure.kind !== 'unknown' || !hasRateLimitDiagnostics(diagnostics)) {
    return failure;
  }
  return {
    ...failure,
    kind: 'rate_limit',
    upstreamStatus: failure.upstreamStatus ?? diagnostics.upstreamStatus ?? 429,
    upstreamRequestId:
      failure.upstreamRequestId ?? diagnostics.upstreamRequestId,
    retryAfterMs: failure.retryAfterMs ?? diagnostics.upstreamRetryAfterMs,
  };
}

function collectProviderErrorDiagnostics(
  error: unknown,
): ProviderErrorDiagnostics {
  const chain: unknown[] = [];
  const seen = new Set<unknown>();
  let current = providerCause(error);
  for (let depth = 0; depth < 8; depth++) {
    if (typeof current !== 'object' || current === null || seen.has(current)) {
      break;
    }
    chain.push(current);
    seen.add(current);
    current = (current as { cause?: unknown }).cause;
  }
  return chain.reduce<ProviderErrorDiagnostics>(
    (diagnostics, item) => ({
      ...extractProviderErrorDiagnostics(item),
      ...diagnostics,
    }),
    {},
  );
}

function providerCause(error: unknown): unknown {
  if (typeof error !== 'object' || error === null) return error;
  const wrapper = error as { code?: unknown; cause?: unknown };
  return wrapper.code === 'PROVIDER_FAILED' ? wrapper.cause : error;
}

function providerErrorContext(
  provider: string,
  modelId: string,
  failure: ProviderFailureFacts,
  diagnostics: ProviderErrorDiagnostics,
): ProviderErrorContext {
  return {
    provider,
    modelId,
    failureStage: failure.stage,
    ...providerDiagnosticContext(diagnostics),
    ...(failure.timeoutSource && { timeoutSource: failure.timeoutSource }),
    ...(failure.upstreamStatus !== undefined && {
      upstreamStatus: failure.upstreamStatus,
    }),
    ...(failure.upstreamRequestId && {
      upstreamRequestId: failure.upstreamRequestId,
    }),
    ...(failure.retryAfterMs !== undefined && {
      retryAfterMs: failure.retryAfterMs,
    }),
    ...(failure.transportCode && {
      underlyingCode: failure.transportCode,
    }),
    ...(failure.host && { host: failure.host }),
  };
}

function providerDiagnosticContext(
  diagnostics: ProviderErrorDiagnostics,
): Pick<
  ProviderErrorContext,
  'upstreamCode' | 'upstreamType' | 'upstreamParam' | 'upstreamReason'
> {
  return {
    ...(diagnostics.upstreamCode && {
      upstreamCode: diagnostics.upstreamCode,
    }),
    ...(diagnostics.upstreamType && {
      upstreamType: diagnostics.upstreamType,
    }),
    ...(diagnostics.upstreamParam && {
      upstreamParam: diagnostics.upstreamParam,
    }),
    ...(diagnostics.upstreamReason && {
      upstreamReason: diagnostics.upstreamReason,
    }),
  };
}

function providerFailureMetadata(
  failure: ProviderFailureFacts,
  context: ProviderErrorContext,
): ErrorMetadata {
  return {
    provider: context.provider,
    modelId: context.modelId,
    failureStage: failure.stage,
    ...(failure.upstreamStatus !== undefined && {
      status: failure.upstreamStatus,
    }),
    ...(failure.upstreamRequestId && {
      upstreamRequestId: failure.upstreamRequestId,
    }),
    ...(failure.retryAfterMs !== undefined && {
      retryAfterMs: failure.retryAfterMs,
    }),
    ...(failure.timeoutSource && { timeoutSource: failure.timeoutSource }),
    ...(failure.transportCode && {
      underlyingCode: failure.transportCode,
    }),
    ...(failure.host && { host: failure.host }),
  };
}

const RUNTIME_IDLE_PREFIX = 'Model provider stream was idle for ';
const MILLISECONDS_SUFFIX = 'ms';

function isRuntimeIdleStall(
  event: RunErrorEvent,
  failure: ProviderFailureFacts,
): boolean {
  const idleMs = readIdleMs(event.message);
  return (
    failure.kind === 'timeout' &&
    event.message.startsWith(RUNTIME_IDLE_PREFIX) &&
    event.message.endsWith(MILLISECONDS_SUFFIX) &&
    Number.isFinite(idleMs) &&
    idleMs > 0
  );
}

function readIdleMs(message: string): number {
  return Number(
    message.slice(RUNTIME_IDLE_PREFIX.length, -MILLISECONDS_SUFFIX.length),
  );
}

function hasRejectionReason(
  error: unknown,
  reason: ProviderRejectionReason,
): boolean {
  return findPortableProviderError(error)?.rejectionReason === reason;
}
