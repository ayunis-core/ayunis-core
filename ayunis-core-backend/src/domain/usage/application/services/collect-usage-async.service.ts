import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { ImageGenerationModel } from 'src/domain/models/domain/models/image-generation.model';
import { LanguageModel } from 'src/domain/models/domain/models/language.model';
import { RunUsageCollectionEvent } from 'src/domain/usage/application/events/run-usage-collection.event';
import type {
  RunUsageCollectionOutcome,
  RunUsageExecutionPath,
} from 'src/domain/usage/application/events/run-usage-collection.event';
import { TokensConsumedEvent } from 'src/domain/usage/application/events/tokens-consumed.event';
import { CollectUsageCommand } from 'src/domain/usage/application/use-cases/collect-usage/collect-usage.command';
import { CollectUsageUseCase } from 'src/domain/usage/application/use-cases/collect-usage/collect-usage.use-case';

interface UsageCollection {
  command: CollectUsageCommand;
  event: TokensConsumedEvent;
  executionPath?: RunUsageExecutionPath;
}

/**
 * Collects usage fire-and-forget by default. Critical callers may await
 * persistence while event delivery remains best-effort.
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
    executionPath?: RunUsageExecutionPath,
  ): void {
    void this.persist(
      this.prepareCollection(
        model,
        inputTokens,
        outputTokens,
        messageId,
        executionPath,
      ),
    ).catch(() => undefined);
  }

  collectCritical(
    model: LanguageModel | ImageGenerationModel,
    inputTokens: number,
    outputTokens: number,
    messageId?: UUID,
    executionPath?: RunUsageExecutionPath,
  ): Promise<void> {
    return this.persist(
      this.prepareCollection(
        model,
        inputTokens,
        outputTokens,
        messageId,
        executionPath,
      ),
    );
  }

  private prepareCollection(
    model: LanguageModel | ImageGenerationModel,
    inputTokens: number,
    outputTokens: number,
    messageId?: UUID,
    executionPath?: RunUsageExecutionPath,
  ): UsageCollection {
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

    const event = new TokensConsumedEvent(
      this.contextService.get('userId'),
      this.contextService.get('apiKeyId'),
      this.contextService.get('orgId'),
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
    return { command, event, executionPath };
  }

  private async persist(collection: UsageCollection): Promise<void> {
    try {
      await this.collectUsageUseCase.execute(collection.command);
    } catch (error) {
      this.handlePersistenceFailure(error, collection.executionPath);
      throw error;
    }

    await this.emitTokensConsumed(collection.event);
    this.emitRunUsageCollection(collection.executionPath, 'success');
  }

  private handlePersistenceFailure(
    error: unknown,
    executionPath?: RunUsageExecutionPath,
  ): void {
    this.logger.warn(
      { err: error as Error, execution_path: executionPath },
      'Usage collection failed',
    );
    this.emitRunUsageCollection(executionPath, 'error');
  }

  private emitRunUsageCollection(
    executionPath: RunUsageExecutionPath | undefined,
    outcome: RunUsageCollectionOutcome,
  ): void {
    if (!executionPath) return;
    try {
      void this.eventEmitter
        .emitAsync(
          RunUsageCollectionEvent.EVENT_NAME,
          new RunUsageCollectionEvent(executionPath, outcome),
        )
        .catch((error: unknown) => this.logRunUsageEventFailure(error));
    } catch (error) {
      this.logRunUsageEventFailure(error);
    }
  }

  private logRunUsageEventFailure(error: unknown): void {
    this.logger.error(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      'Failed to emit RunUsageCollectionEvent',
    );
  }

  private async emitTokensConsumed(event: TokensConsumedEvent): Promise<void> {
    try {
      await this.eventEmitter.emitAsync(TokensConsumedEvent.EVENT_NAME, event);
    } catch (error) {
      this.logger.error(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        'Failed to emit TokensConsumedEvent',
      );
    }
  }
}
