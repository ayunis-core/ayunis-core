import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { RuntimeLanguageModelResolver } from 'src/domain/runs/application/agent-runtime/runtime-model.registry';
import { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';

@Injectable()
export class UsageHookFactory {
  constructor(private readonly inferenceUsageGuard: InferenceUsageGuard) {}

  create(params: { resolveModel: RuntimeLanguageModelResolver }): Hook {
    return {
      name: 'ayunis-usage',
      inheritToChildRuns: true,
      afterModelCallFailureMode: 'critical',
      afterModelCall: async (ctx) => {
        const model = params.resolveModel(ctx.model);
        const usage = ctx.outcome.usage;
        const hasReportedUsage = [
          usage.inputTokens,
          usage.outputTokens,
          usage.cacheReadInputTokens,
          usage.cacheWriteInputTokens,
        ].some((value) => value !== undefined);
        if (!hasReportedUsage) {
          if (model.consumesCredits && requiresReportedUsage(ctx.outcome)) {
            throw new Error(
              'Paid model call completed without reporting usage',
            );
          }
          return;
        }

        await this.inferenceUsageGuard.collectUsageCritical(
          model,
          {
            inputTokens:
              (usage.inputTokens ?? 0) +
              (usage.cacheReadInputTokens ?? 0) +
              (usage.cacheWriteInputTokens ?? 0),
            outputTokens: usage.outputTokens ?? 0,
          },
          ctx.modelCallId as UUID,
          'agent_runtime',
        );
      },
    };
  }
}

function requiresReportedUsage(
  outcome: Parameters<NonNullable<Hook['afterModelCall']>>[0]['outcome'],
): boolean {
  if (outcome.providerConsumptionStarted || outcome.outputState === 'final') {
    return true;
  }
  return (
    outcome.type === 'provider_failure' &&
    outcome.providerFailure.stage === 'stream_consumption'
  );
}
