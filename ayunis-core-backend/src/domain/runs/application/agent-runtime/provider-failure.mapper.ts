import type {
  ProviderFailureFacts,
  RunEvent,
  TerminalModelCallInfo,
} from '@ayunis/agent-runtime';
import type {
  ApplicationError,
  ErrorMetadata,
} from 'src/common/errors/base.error';
import {
  extractProviderErrorDiagnostics,
  hasRateLimitDiagnostics,
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

interface ProviderFailureSource {
  readonly message: string;
  readonly modelCall: TerminalModelCallInfo;
  readonly providerFailure: ProviderFailureFacts;
}

export function mapPortableProviderError(
  event: RunErrorEvent,
  models: RuntimeModelRegistry | undefined,
): ApplicationError | undefined {
  if (event.code !== 'PROVIDER_FAILED' || !event.modelCall) {
    return undefined;
  }
  if (!event.providerFailure) {
    return mapEmptyModelResponse(event.message, event.modelCall, models);
  }
  return mapClassifiedProviderFailure(
    {
      message: event.message,
      modelCall: event.modelCall,
      providerFailure: event.providerFailure,
    },
    models,
  );
}

/**
 * A critical hook that fails on top of a provider failure must not hide the
 * provider classification the run would otherwise have reported.
 */
export function mapProviderFailureBehindHook(
  event: RunErrorEvent,
  models: RuntimeModelRegistry | undefined,
): ApplicationError | undefined {
  if (
    event.code !== 'HOOK_FAILED' ||
    !event.modelCall ||
    !event.providerFailure
  ) {
    return undefined;
  }
  return mapClassifiedProviderFailure(
    {
      message: underlyingErrorMessage(event) ?? event.message,
      modelCall: event.modelCall,
      providerFailure: event.providerFailure,
    },
    models,
  );
}

function underlyingErrorMessage(event: RunErrorEvent): string | undefined {
  const underlying = event.details?.underlyingError;
  if (typeof underlying !== 'object' || underlying === null) return undefined;
  const message = (underlying as { message?: unknown }).message;
  return typeof message === 'string' ? message : undefined;
}

function mapClassifiedProviderFailure(
  source: ProviderFailureSource,
  models: RuntimeModelRegistry | undefined,
): ApplicationError | undefined {
  if (!models) return undefined;
  const model = resolveModel(models, source.modelCall.provider);
  if (!model) return undefined;
  return mapResolvedProviderError(
    source.message,
    models,
    model,
    source.providerFailure,
    source.modelCall.modelCallId,
  );
}

function resolveModel(
  models: RuntimeModelRegistry,
  runtimeProviderName: string,
): LanguageModel | undefined {
  try {
    return models.resolveByProviderName(runtimeProviderName);
  } catch {
    return undefined;
  }
}

const EMPTY_RESPONSE_REASONS: Readonly<Record<string, string>> = {
  'Model provider returned an empty response':
    'model returned an empty response',
  'Model provider returned no answer': 'model returned no answer',
};

function mapEmptyModelResponse(
  message: string,
  modelCall: TerminalModelCallInfo,
  models: RuntimeModelRegistry | undefined,
): ApplicationError | undefined {
  const reason = EMPTY_RESPONSE_REASONS[message];
  if (!reason) return undefined;
  const model = models && resolveModel(models, modelCall.provider);
  return new InferenceFailedError(reason, {
    ...(model
      ? { provider: model.provider, modelId: model.name }
      : { runtimeProvider: modelCall.provider }),
    modelCallId: modelCall.modelCallId,
    trigger: modelCall.trigger,
    callSequence: modelCall.callSequence,
  });
}

function mapResolvedProviderError(
  message: string,
  models: RuntimeModelRegistry,
  model: LanguageModel,
  providerFailure: ProviderFailureFacts,
  modelCallId: string,
): ApplicationError {
  const callError = models.getCallError(modelCallId);
  const diagnostics: ProviderErrorDiagnostics = {
    ...collectProviderErrorDiagnostics(callError),
    ...(providerFailure.kind === 'rejection' && providerFailure.rejectionReason
      ? { upstreamReason: providerFailure.rejectionReason }
      : {}),
  };
  const failure = classifyKnownRateLimit(providerFailure, diagnostics);
  const context = providerErrorContext(
    model.provider,
    model.name,
    failure,
    diagnostics,
  );
  if (isRuntimeIdleStall(message, failure)) {
    return new InferenceStreamStalledError(
      readIdleMs(message),
      providerFailureMetadata(failure, context),
    );
  }
  const rejectionError = mapActionableRejection(failure, context);
  if (rejectionError) return rejectionError;
  return mapProviderFailure(failure, context, diagnostics);
}

function mapActionableRejection(
  failure: ProviderFailureFacts,
  context: ProviderErrorContext,
): ApplicationError | undefined {
  if (failure.kind !== 'rejection') return undefined;
  const metadata = {
    provider: context.provider,
    modelId: context.modelId,
    status: failure.upstreamStatus,
    upstreamRequestId: failure.upstreamRequestId,
  };
  if (failure.rejectionReason === 'context_length_exceeded')
    return new RunContextBudgetExceededError(metadata);
  if (failure.rejectionReason === 'image_too_large')
    return new InferenceImageTooLargeError(metadata);
  return undefined;
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
  message: string,
  failure: ProviderFailureFacts,
): boolean {
  const idleMs = readIdleMs(message);
  return (
    failure.kind === 'timeout' &&
    message.startsWith(RUNTIME_IDLE_PREFIX) &&
    message.endsWith(MILLISECONDS_SUFFIX) &&
    Number.isFinite(idleMs) &&
    idleMs > 0
  );
}

function readIdleMs(message: string): number {
  return Number(
    message.slice(RUNTIME_IDLE_PREFIX.length, -MILLISECONDS_SUFFIX.length),
  );
}
