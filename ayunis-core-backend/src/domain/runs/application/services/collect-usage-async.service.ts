import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { Counter } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { CollectUsageUseCase } from 'src/domain/usage/application/use-cases/collect-usage/collect-usage.use-case';
import { CollectUsageCommand } from 'src/domain/usage/application/use-cases/collect-usage/collect-usage.command';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { ContextService } from 'src/common/context/services/context.service';
import { AYUNIS_TOKENS_TOTAL } from 'src/metrics/metrics.constants';
import { getUserContextLabels, safeMetric } from 'src/metrics/metrics.utils';

/**
 * Collects usage data asynchronously (fire-and-forget).
 * Errors are logged but don't block the main flow.
 */
@Injectable()
export class CollectUsageAsyncService {
  private readonly logger = new Logger(CollectUsageAsyncService.name);

  constructor(
    private readonly collectUsageUseCase: CollectUsageUseCase,
    private readonly contextService: ContextService,
    @InjectMetric(AYUNIS_TOKENS_TOTAL)
    private readonly tokensCounter: Counter<string>,
  ) {}

  collect(
    model: LanguageModel,
    inputTokens: number,
    outputTokens: number,
    messageId?: UUID,
  ): void {
    this.logger.debug('Collecting usage', {
      modelId: model.id,
      modelName: model.name,
      inputTokens,
      outputTokens,
      messageId,
    });

    const labels = getUserContextLabels(this.contextService);

    if (inputTokens > 0) {
      safeMetric(this.logger, () => {
        this.tokensCounter.inc(
          {
            ...labels,
            model: model.name,
            provider: model.provider,
            direction: 'input',
          },
          inputTokens,
        );
      });
    }

    if (outputTokens > 0) {
      safeMetric(this.logger, () => {
        this.tokensCounter.inc(
          {
            ...labels,
            model: model.name,
            provider: model.provider,
            direction: 'output',
          },
          outputTokens,
        );
      });
    }

    this.collectUsageUseCase
      .execute(
        new CollectUsageCommand({
          model,
          inputTokens,
          outputTokens,
          requestId: messageId,
        }),
      )
      .catch((error) => {
        this.logger.debug('Usage collection failed', {
          error: error as Error,
        });
      });
  }
}
