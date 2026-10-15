import type { AfterModelCallContext, Hook } from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import type { RuntimeLanguageModelResolver } from 'src/domain/runs/application/agent-runtime/runtime-model.registry';
import { CollectUsageAsyncService } from 'src/domain/usage/application/services/collect-usage-async.service';

type ModelCallOutcome = AfterModelCallContext['outcome'];

@Injectable()
export class UsageHookFactory {
  private readonly logger = new Logger(UsageHookFactory.name);

  constructor(
    private readonly collectUsageAsyncService: CollectUsageAsyncService,
  ) {}

  create(params: { resolveModel: RuntimeLanguageModelResolver }): Hook {
    return {
      name: 'ayunis-usage',
      inheritToChildRuns: true,
      afterModelCallFailureMode: 'critical',
      afterModelCall: async (ctx) => {
        const model = params.resolveModel(ctx.model);
        const usage = ctx.outcome.usage;
        if (!hasReportedUsage(usage)) {
          this.handleMissingUsage(ctx, model);
          return;
        }

        await this.collectUsageAsyncService.collectCritical(
          model,
          (usage.inputTokens ?? 0) +
            (usage.cacheReadInputTokens ?? 0) +
            (usage.cacheWriteInputTokens ?? 0),
          usage.outputTokens ?? 0,
          ctx.modelCallId as UUID,
          'agent_runtime',
        );
      },
    };
  }

  private handleMissingUsage(
    ctx: AfterModelCallContext,
    model: LanguageModel,
  ): void {
    if (!model.consumesCredits || !requiresReportedUsage(ctx.outcome)) {
      return;
    }
    if (!endedByConsumer(ctx.outcome)) {
      throw new Error('Paid model call completed without reporting usage');
    }
    // The run is already over for the user, so failing the hook would only
    // turn a closed tab into an incident without recovering the usage.
    this.logger.warn(
      {
        execution_path: 'agent_runtime',
        modelCallId: ctx.modelCallId,
        provider: model.provider,
        model: model.name,
        trigger: ctx.trigger,
        callSequence: ctx.callSequence,
        outcome: ctx.outcome.type,
        providerConsumptionStarted: ctx.outcome.providerConsumptionStarted,
        producedOutput: ctx.outcome.producedOutput,
      },
      'Usage unknown for a model call the consumer ended',
    );
  }
}

function hasReportedUsage(usage: ModelCallOutcome['usage']): boolean {
  return [
    usage.inputTokens,
    usage.outputTokens,
    usage.cacheReadInputTokens,
    usage.cacheWriteInputTokens,
  ].some((value) => value !== undefined);
}

function endedByConsumer(outcome: ModelCallOutcome): boolean {
  return outcome.type === 'consumer_abandoned' || outcome.type === 'aborted';
}

function requiresReportedUsage(outcome: ModelCallOutcome): boolean {
  if (outcome.providerConsumptionStarted || outcome.outputState === 'final') {
    return true;
  }
  // Azure can report a token rate limit on an already-open stream. The request
  // was refused before inference, so there is no usage to account for and the
  // call stays retryable.
  return (
    outcome.type === 'provider_failure' &&
    outcome.providerFailure.stage === 'stream_consumption' &&
    outcome.providerFailure.kind !== 'rate_limit'
  );
}
