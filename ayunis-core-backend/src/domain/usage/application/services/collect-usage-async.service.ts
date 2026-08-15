import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { CollectUsageCommand } from '../use-cases/collect-usage/collect-usage.command';
import { CollectUsageUseCase } from '../use-cases/collect-usage/collect-usage.use-case';
import { TokensConsumedEvent } from '../events/tokens-consumed.event';
import {
  RunUsageCollectionEvent,
  type RunUsageCollectionOutcome,
  type RunUsageExecutionPath,
} from '../events/run-usage-collection.event';

/**
 * Collects usage data asynchronously (fire-and-forget).
 * Errors are logged but don't block the main flow.
 */
@Injectable()
export class CollectUsageAsyncService {
  constructor(
    private readonly collectUsageUseCase: CollectUsageUseCase,
    private readonly contextService: ContextService,
    private readonly eventEmitter: EventEmitter2,
    @InjectPinoLogger(CollectUsageAsyncService.name)
    private readonly logger: PinoLogger,
  ) {}

  collect(
    model: LanguageModel | ImageGenerationModel,
    inputTokens: number,
    outputTokens: number,
    messageId?: UUID,
    executionPath?: RunUsageExecutionPath,
  ): void {
    this.logger.debug(
      {
        modelId: model.id,
        modelName: model.name,
        inputTokens,
        outputTokens,
        messageId,
      },
      'Collecting usage',
    );

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

    const command = new CollectUsageCommand({
      model,
      inputTokens,
      outputTokens,
      requestId: messageId,
    });
    this.persist(command, event, executionPath);
  }

  private persist(
    command: CollectUsageCommand,
    event: TokensConsumedEvent,
    executionPath?: RunUsageExecutionPath,
  ): void {
    this.collectUsageUseCase
      .execute(command)
      .then(async () => {
        await this.emitTokensConsumed(event);
        this.emitRunUsageCollection(executionPath, 'success');
      })
      .catch((error) => {
        this.logger.warn(
          { err: error as Error, execution_path: executionPath },
          'Usage collection failed',
        );
        this.emitRunUsageCollection(executionPath, 'error');
      });
  }

  private emitRunUsageCollection(
    executionPath: RunUsageExecutionPath | undefined,
    outcome: RunUsageCollectionOutcome,
  ): void {
    if (!executionPath) return;
    this.eventEmitter
      .emitAsync(
        RunUsageCollectionEvent.EVENT_NAME,
        new RunUsageCollectionEvent(executionPath, outcome),
      )
      .catch((error: unknown) => {
        this.logger.error(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'Failed to emit RunUsageCollectionEvent',
        );
      });
  }

  private async emitTokensConsumed(event: TokensConsumedEvent): Promise<void> {
    try {
      await this.eventEmitter.emitAsync(TokensConsumedEvent.EVENT_NAME, event);
    } catch (err) {
      this.logger.error(
        {
          error: err instanceof Error ? err.message : 'Unknown error',
        },
        'Failed to emit TokensConsumedEvent',
      );
    }
  }
}
