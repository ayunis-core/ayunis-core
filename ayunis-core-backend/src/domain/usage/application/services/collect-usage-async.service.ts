import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { CollectUsageCommand } from '../use-cases/collect-usage/collect-usage.command';
import { CollectUsageUseCase } from '../use-cases/collect-usage/collect-usage.use-case';
import { TokensConsumedEvent } from '../events/tokens-consumed.event';

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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  collect(
    model: LanguageModel | ImageGenerationModel,
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

    const userId = this.contextService.get('userId');
    const apiKeyId = this.contextService.get('apiKeyId');
    const orgId = this.contextService.get('orgId');

    const event = new TokensConsumedEvent(
      userId,
      apiKeyId,
      orgId,
      model.name,
      model.provider,
      inputTokens,
      outputTokens,
    );

    // Emitted only after the usage row is persisted, so listeners can read
    // their own writes (BudgetAlertsListener re-queries consumption); a
    // failed persist emits nothing — there is no recorded usage to react to.
    this.collectUsageUseCase
      .execute(
        new CollectUsageCommand({
          model,
          inputTokens,
          outputTokens,
          requestId: messageId,
        }),
      )
      .then(() => this.emitTokensConsumed(event))
      .catch((error) => {
        this.logger.debug('Usage collection failed', {
          error: error as Error,
        });
      });
  }

  private async emitTokensConsumed(event: TokensConsumedEvent): Promise<void> {
    try {
      await this.eventEmitter.emitAsync(TokensConsumedEvent.EVENT_NAME, event);
    } catch (err) {
      this.logger.error('Failed to emit TokensConsumedEvent', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }
}
