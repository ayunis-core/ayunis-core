import type {
  AfterModelCallContext,
  Hook,
  ModelCallOutcomeSnapshot,
  ProviderFailureKind,
  ProviderRequest,
} from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import { findPortableProviderError } from 'src/common/errors/find-portable-provider-error.helper';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import {
  extractProviderErrorDiagnostics,
  extractProviderExplanation,
} from 'src/common/errors/extract-provider-error-diagnostics.helper';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { buildProviderRequestDiagnostics } from 'src/domain/runs/application/agent-runtime/provider-request-diagnostics.helper';
import type { RuntimeModelRegistry } from 'src/domain/runs/application/agent-runtime/runtime-model.registry';
import type { RuntimeToolIntegrationRegistry } from 'src/domain/runs/application/agent-runtime/runtime-tool-integration.registry';
import {
  InferenceCompletedEvent,
  type InferenceErrorInfo,
} from 'src/domain/runs/application/events/inference-completed.event';

interface ObservabilityHookParams {
  readonly userId: UUID;
  readonly orgId: UUID;
  readonly models: RuntimeModelRegistry;
  readonly toolIntegrations?: RuntimeToolIntegrationRegistry;
}

interface RequestDiagnostics {
  readonly messageCount: number;
  readonly toolCount: number;
  readonly toolChoice?: ProviderRequest['toolChoice'];
  readonly toolSchemaBytes: number;
  readonly toolSetHash: string;
  readonly tools: ReturnType<typeof buildProviderRequestDiagnostics>['tools'];
}

@Injectable()
export class ModelCallObservabilityHookFactory {
  private readonly logger = new Logger(ModelCallObservabilityHookFactory.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  create(params: ObservabilityHookParams): Hook {
    const requests = new Map<string, RequestDiagnostics>();
    return {
      name: 'ayunis-model-call-observability',
      inheritToChildRuns: true,
      afterModelCallFailureMode: 'best_effort',
      beforeModelCall: (ctx) => {
        try {
          requests.set(ctx.modelCallId, {
            messageCount: ctx.request.messages.length,
            toolCount: ctx.request.tools.length,
            ...(ctx.request.toolChoice
              ? { toolChoice: ctx.request.toolChoice }
              : {}),
            ...buildProviderRequestDiagnostics(
              ctx.request,
              params.toolIntegrations,
            ),
          });
        } catch {
          this.logger.warn(
            { modelCallId: ctx.modelCallId },
            'Failed to build provider request diagnostics',
          );
        }
      },
      afterModelCall: (ctx) =>
        this.observeCall(ctx, params, requests.get(ctx.modelCallId)),
    };
  }

  private async observeCall(
    ctx: AfterModelCallContext,
    params: ObservabilityHookParams,
    request: RequestDiagnostics | undefined,
  ): Promise<void> {
    if ('error' in ctx.outcome) {
      params.models.recordCallError(ctx.modelCallId, ctx.outcome.error);
    }
    const model = params.models.resolve(ctx.model);
    this.logFailure(ctx.outcome, model, request);
    this.logRejection(ctx.outcome, model);
    await this.emitCompletion(ctx, params, model);
  }

  private logFailure(
    outcome: ModelCallOutcomeSnapshot,
    model: LanguageModel,
    request: RequestDiagnostics | undefined,
  ): void {
    if (outcome.type !== 'provider_failure') return;
    const source = findPortableProviderError(outcome.error) ?? outcome.error;
    const diagnostics = extractProviderErrorDiagnostics(source);
    const context = {
      model: model.name,
      provider: model.provider,
      modelCallId: outcome.modelCallId,
      trigger: outcome.trigger,
      callSequence: outcome.callSequence,
      providerConsumptionStarted: outcome.providerConsumptionStarted,
      producedOutput: outcome.producedOutput,
      visibleOutput: outcome.visibleOutput,
      ...providerFailureContext(outcome.providerFailure),
      upstreamMessage: extractProviderExplanation(source),
      ...request,
    };
    if (isProviderUnavailable(outcome.providerFailure.kind)) {
      this.logger.error(
        context,
        'Provider unavailable during runtime inference',
      );
      return;
    }
    this.logger.error(
      { ...context, ...diagnostics },
      'Provider stream inference failed',
    );
  }

  private logRejection(
    outcome: ModelCallOutcomeSnapshot,
    model: LanguageModel,
  ): void {
    if (outcome.type !== 'rejected') return;
    this.logger.warn(
      {
        model: model.name,
        provider: model.provider,
        modelCallId: outcome.modelCallId,
        trigger: outcome.trigger,
        callSequence: outcome.callSequence,
        providerConsumptionStarted: outcome.providerConsumptionStarted,
        producedOutput: outcome.producedOutput,
        visibleOutput: outcome.visibleOutput,
        rejectionReason: outcome.reason,
        ...malformedDetails(outcome.error.details),
        contentTypes: outcome.message.content.map((content) => content.type),
        finishReason: outcome.finishReason,
        inputTokens: outcome.usage.inputTokens,
        outputTokens: outcome.usage.outputTokens,
        durationMs: outcome.durationMs,
      },
      'Model call rejected',
    );
  }

  private async emitCompletion(
    ctx: AfterModelCallContext,
    params: ObservabilityHookParams,
    model: LanguageModel,
  ): Promise<void> {
    try {
      await this.eventEmitter.emitAsync(
        InferenceCompletedEvent.EVENT_NAME,
        new InferenceCompletedEvent(
          params.userId,
          params.orgId,
          model.name,
          model.provider,
          true,
          ctx.outcome.durationMs,
          'agent_runtime',
          inferenceErrorInfo(ctx.outcome),
          {
            modelCallId: ctx.modelCallId,
            runId: ctx.runId,
            turn: ctx.turn,
            callSequence: ctx.callSequence,
            trigger: ctx.trigger,
            outcome: ctx.outcome.type,
          },
        ),
      );
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to emit InferenceCompletedEvent',
      );
    }
  }
}

function inferenceErrorInfo(
  outcome: ModelCallOutcomeSnapshot,
): InferenceErrorInfo | undefined {
  if (outcome.type === 'accepted' || outcome.type === 'consumer_abandoned') {
    return undefined;
  }
  if (outcome.type === 'provider_failure') {
    return {
      message: providerFailureMessage(outcome.providerFailure.kind),
      ...(outcome.providerFailure.upstreamStatus !== undefined && {
        statusCode: outcome.providerFailure.upstreamStatus,
      }),
    };
  }
  if (outcome.type === 'aborted') {
    return { message: 'Inference aborted by client' };
  }
  return { message: outcome.error.message };
}

function malformedDetails(
  details: Readonly<Record<string, unknown>> | undefined,
): Record<string, unknown> {
  if (typeof details?.reason !== 'string') return {};
  return {
    malformedReason: details.reason,
    toolNames: Array.isArray(details.toolNames) ? details.toolNames : [],
  };
}

function providerFailureMessage(kind: ProviderFailureKind): string {
  const messages: Readonly<Record<string, string>> = {
    connection: 'Provider connection failed',
    timeout: 'Provider request timed out',
    server: 'Provider returned a server error',
    rate_limit: 'Provider rate limit exceeded',
    rejection: 'Provider rejected the request',
    abort: 'Inference aborted by client',
    unknown: 'Provider inference failed',
  };
  return messages[kind] ?? messages.unknown;
}

function providerFailureContext(failure: {
  readonly kind: string;
  readonly stage: string;
  readonly upstreamStatus?: number;
  readonly upstreamRequestId?: string;
  readonly retryAfterMs?: number;
  readonly timeoutSource?: string;
  readonly transportCode?: string;
  readonly host?: string;
}): Record<string, unknown> {
  return {
    failureKind: failure.kind,
    failureStage: failure.stage,
    ...(failure.upstreamStatus !== undefined && {
      upstreamStatus: failure.upstreamStatus,
    }),
    ...(failure.upstreamRequestId && {
      upstreamRequestId: failure.upstreamRequestId,
    }),
    ...(failure.retryAfterMs !== undefined && {
      retryAfterMs: failure.retryAfterMs,
    }),
    ...(failure.timeoutSource && { timeoutSource: failure.timeoutSource }),
    ...(failure.transportCode && { underlyingCode: failure.transportCode }),
    ...(failure.host && { host: failure.host }),
  };
}

function isProviderUnavailable(kind: string): boolean {
  return ['connection', 'timeout', 'server', 'rate_limit'].includes(kind);
}
