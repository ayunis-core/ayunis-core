import type { AfterModelCallContext, Hook } from '@ayunis/agent-runtime';
import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import {
  estimateBillableRequestTokens,
  estimateOutputTokens,
  type RequestTokenEstimate,
} from 'src/domain/runs/application/agent-runtime/model-call-token-estimate.helper';
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
    const requests = new Map<string, RequestTokenEstimate>();
    return {
      name: 'ayunis-usage',
      inheritToChildRuns: true,
      afterModelCallFailureMode: 'critical',
      beforeModelCall: (ctx) => {
        requests.set(
          ctx.modelCallId,
          estimateBillableRequestTokens(ctx.model, ctx.request),
        );
      },
      afterModelCall: async (ctx) => {
        const request = requests.get(ctx.modelCallId);
        requests.delete(ctx.modelCallId);
        const model = params.resolveModel(ctx.model);
        const usage = ctx.outcome.usage;
        if (!hasReportedUsage(usage)) {
          await this.handleMissingUsage(ctx, model, request);
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

  private async handleMissingUsage(
    ctx: AfterModelCallContext,
    model: LanguageModel,
    request: RequestTokenEstimate | undefined,
  ): Promise<void> {
    if (!model.consumesCredits || !requiresReportedUsage(ctx.outcome)) {
      return;
    }
    // OpenAI-compatible and Mistral streams report usage only in their last
    // chunk, so an interrupted stream never carries it although the provider
    // bills the work it did. A completed call without usage is a provider
    // integration defect that an estimate would hide.
    if (!wasInterrupted(ctx.outcome) || !request) {
      throw new Error('Paid model call completed without reporting usage');
    }
    const estimatedOutputTokens = estimateOutputTokens(ctx.model, ctx.outcome);
    await this.collectUsageAsyncService.collectCritical(
      model,
      request.estimatedInputTokens,
      estimatedOutputTokens,
      ctx.modelCallId as UUID,
      'agent_runtime',
    );
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
        estimatedInputTokens: request.estimatedInputTokens,
        estimatedOutputTokens,
        exactTokenizer: request.exactTokenizer,
      },
      'Recorded estimated usage for a model call that ended without reporting usage',
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

function wasInterrupted(outcome: ModelCallOutcome): boolean {
  return (
    outcome.type === 'provider_failure' ||
    outcome.type === 'consumer_abandoned' ||
    outcome.type === 'aborted'
  );
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
