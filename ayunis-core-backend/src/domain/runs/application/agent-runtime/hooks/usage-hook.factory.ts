import type { Hook } from '@ayunis/agent-runtime';
import { Injectable } from '@nestjs/common';
import type { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { InferenceUsageGuard } from '../../services/inference-usage-guard.service';

/**
 * Builds the usage-metering hook: after each model call it records billed
 * tokens against the org's fair-use + credit budgets. Cached prompt tokens are
 * folded into billed input exactly as the legacy streaming path does — the
 * provider's `inputTokens` excludes cache-covered tokens, so without this the
 * billed input collapses to the uncached remainder.
 */
@Injectable()
export class UsageHookFactory {
  constructor(private readonly inferenceUsageGuard: InferenceUsageGuard) {}

  create(params: { model: LanguageModel }): Hook {
    return {
      name: 'ayunis-usage',
      afterModelCall: (ctx) => {
        const usage = ctx.usage;
        this.inferenceUsageGuard.collectUsage(params.model, {
          inputTokens:
            (usage.inputTokens ?? 0) +
            (usage.cacheReadInputTokens ?? 0) +
            (usage.cacheWriteInputTokens ?? 0),
          outputTokens: usage.outputTokens ?? 0,
        });
      },
    };
  }
}
