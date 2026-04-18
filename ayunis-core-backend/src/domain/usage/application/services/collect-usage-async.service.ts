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
    const orgId = this.contextService.get('orgId');

    this.eventEmitter
      .emitAsync(
        TokensConsumedEvent.EVENT_NAME,
        new TokensConsumedEvent(
          userId ?? ('unknown' as UUID),
          orgId ?? ('unknown' as UUID),
          model.name,
          model.provider,
          inputTokens,
          outputTokens,
        ),
      )
      .catch((err: unknown) => {
        this.logger.error('Failed to emit TokensConsumedEvent', {
          error: err instanceof Error ? err.message : 'Unknown error',
        });
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
