import type { Hook, ModelProvider } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';

export type RuntimeLanguageModelResolver = (
  provider: ModelProvider,
) => LanguageModel;

@Injectable()
export class UsageHookFactory {
  constructor(private readonly inferenceUsageGuard: InferenceUsageGuard) {}

  create(params: { resolveModel: RuntimeLanguageModelResolver }): Hook {
    return {
      name: 'ayunis-usage',
      inheritToChildRuns: true,
      afterModelCallFailureMode: 'critical',
      afterModelCall: async (ctx) => {
        const usage = ctx.outcome.usage;
        const hasReportedUsage = [
          usage.inputTokens,
          usage.outputTokens,
          usage.cacheReadInputTokens,
          usage.cacheWriteInputTokens,
        ].some((value) => value !== undefined);
        if (!hasReportedUsage) return;

        await this.inferenceUsageGuard.collectUsageCritical(
          params.resolveModel(ctx.model),
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
