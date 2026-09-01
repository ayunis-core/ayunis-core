import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { assistantMessageId } from 'src/domain/runs/application/agent-runtime/message-id';
import { InferenceUsageGuard } from 'src/domain/runs/application/services/inference-usage-guard.service';

/**
 * Builds the usage-metering hook: after each model call it records billed
 * tokens against the org's fair-use + credit budgets. Cached prompt tokens are
 * folded into billed input because the provider's `inputTokens` excludes
 * cache-covered tokens.
 */
@Injectable()
export class UsageHookFactory {
  constructor(private readonly inferenceUsageGuard: InferenceUsageGuard) {}

  create(params: { model: LanguageModel }): Hook {
    return {
      name: 'ayunis-usage',
      afterModelCall: (ctx) => {
        const usage = ctx.usage;
        const hasReportedUsage = [
          usage.inputTokens,
          usage.outputTokens,
          usage.cacheReadInputTokens,
          usage.cacheWriteInputTokens,
        ].some((value) => value !== undefined);
        if (!hasReportedUsage) {
          return;
        }
        this.inferenceUsageGuard.collectUsage(
          params.model,
          {
            inputTokens:
              (usage.inputTokens ?? 0) +
              (usage.cacheReadInputTokens ?? 0) +
              (usage.cacheWriteInputTokens ?? 0),
            outputTokens: usage.outputTokens ?? 0,
          },
          assistantMessageId(ctx.context.runId, ctx.iteration),
          'agent_runtime',
        );
      },
    };
  }
}
