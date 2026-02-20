import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { CollectUsageUseCase } from 'src/domain/usage/application/use-cases/collect-usage/collect-usage.use-case';
import { CollectUsageCommand } from 'src/domain/usage/application/use-cases/collect-usage/collect-usage.command';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';

/**
 * Collects usage data asynchronously (fire-and-forget).
 * Errors are logged but don't block the main flow.
 */
@Injectable()
export class CollectUsageAsyncService {
  private readonly logger = new Logger(CollectUsageAsyncService.name);

  constructor(private readonly collectUsageUseCase: CollectUsageUseCase) {}

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
