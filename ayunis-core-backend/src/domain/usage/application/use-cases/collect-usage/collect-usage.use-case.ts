import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID, type UUID } from 'crypto';
import { CollectUsageCommand } from './collect-usage.command';
import { Usage } from '../../../domain/usage.entity';
import { UsageRepository } from '../../ports/usage.repository';
import {
  InvalidUsageDataError,
  UsageCollectionFailedError,
  UnexpectedUsageError,
} from '../../usage.errors';
import { UsageCollectedEvent } from '../../events/usage-collected.event';
import { ApplicationError } from '../../../../../common/errors/base.error';
import { ContextService } from '../../../../../common/context/services/context.service';
import { GetCreditsPerEuroUseCase } from '../../../../../iam/platform-config/application/use-cases/get-credits-per-euro/get-credits-per-euro.use-case';
import { PlatformConfigNotFoundError } from '../../../../../iam/platform-config/application/platform-config.errors';

interface UsagePrincipal {
  userId: UUID | undefined;
  apiKeyId: UUID | undefined;
  organizationId: UUID;
}

@Injectable()
export class CollectUsageUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly contextService: ContextService,
    private readonly getCreditsPerEuroUseCase: GetCreditsPerEuroUseCase,
    private readonly eventEmitter: EventEmitter2,
    @InjectPinoLogger(CollectUsageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(command: CollectUsageCommand): Promise<void> {
    const userId = this.contextService.get('userId');
    const apiKeyId = this.contextService.get('apiKeyId');
    const organizationId = this.contextService.get('orgId');

    // Enforce XOR on the principal: exactly one of userId or apiKeyId must
    // be set. The DB `CHK_usage_principal_not_both` constraint rejects
    // "both set" as a safety net; we reject both "neither" and "both" here
    // so the failure is synchronous and the error type is meaningful.
    const hasUserId = !!userId;
    const hasApiKeyId = !!apiKeyId;
    if (hasUserId === hasApiKeyId || !organizationId) {
      throw new UsageCollectionFailedError(
        'Exactly one of userId or apiKeyId must be set in context, and Organization ID is required',
        {
          userId: userId ?? undefined,
          apiKeyId: apiKeyId ?? undefined,
          organizationId: organizationId ?? undefined,
          modelId: command.modelId,
        },
      );
    }

    const principal = { userId, apiKeyId, organizationId };
    this.logCollection(command, principal);
    try {
      await this.collectUsage(command, principal);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logCollectionFailure(command, error);
      throw new UnexpectedUsageError(
        error instanceof Error ? error : new Error('Unknown error'),
        {
          userId,
          organizationId,
          modelId: command.modelId,
        },
      );
    }
  }

  private logCollectionFailure(
    command: CollectUsageCommand,
    error: unknown,
  ): void {
    this.logger.error(
      {
        err: error as Error,
        modelId: command.modelId,
        provider: command.provider,
        inputTokens: command.inputTokens,
        outputTokens: command.outputTokens,
        totalTokens: command.totalTokens,
        requestId: command.requestId,
      },
      'Failed to collect usage',
    );
  }

  private logCollection(
    command: CollectUsageCommand,
    principal: UsagePrincipal,
  ): void {
    this.logger.info(
      {
        ...principal,
        modelId: command.modelId,
        provider: command.provider,
        totalTokens: command.totalTokens,
      },
      'CollectUsageUseCase.execute called',
    );
  }

  private async collectUsage(
    command: CollectUsageCommand,
    principal: UsagePrincipal,
  ): Promise<void> {
    this.validateCommand(command);
    const cost = this.calculateCost(command);
    const creditsConsumed = await this.calculateCredits(cost);
    const usage = this.createUsage(command, principal, cost, creditsConsumed);
    await this.usageRepository.save(usage);
    this.emitUsageCollected(usage, command.model.name);
    this.logger.info(
      {
        ...principal,
        modelId: command.modelId,
        provider: command.provider,
        totalTokens: command.totalTokens,
        cost,
        requestId: command.requestId,
      },
      'Usage collected successfully',
    );
  }

  private createUsage(
    command: CollectUsageCommand,
    principal: UsagePrincipal,
    cost: number | undefined,
    creditsConsumed: number | undefined,
  ): Usage {
    return new Usage({
      userId: principal.userId ?? null,
      apiKeyId: principal.apiKeyId ?? null,
      organizationId: principal.organizationId,
      modelId: command.modelId,
      provider: command.provider,
      inputTokens: command.inputTokens,
      outputTokens: command.outputTokens,
      totalTokens: command.totalTokens,
      cost,
      creditsConsumed,
      requestId: command.requestId ?? randomUUID(),
    });
  }

  private emitUsageCollected(usage: Usage, modelName: string): void {
    this.eventEmitter
      .emitAsync(
        UsageCollectedEvent.EVENT_NAME,
        new UsageCollectedEvent(usage, modelName),
      )
      .catch((err: unknown) => {
        this.logger.error(
          {
            error: err instanceof Error ? err.message : 'Unknown error',
            usageId: usage.id,
          },
          'Failed to emit UsageCollectedEvent',
        );
      });
  }

  private validateCommand(command: CollectUsageCommand): void {
    if (command.inputTokens < 0) {
      throw new InvalidUsageDataError('Input tokens cannot be negative', {
        inputTokens: command.inputTokens,
      });
    }
    if (command.outputTokens < 0) {
      throw new InvalidUsageDataError('Output tokens cannot be negative', {
        outputTokens: command.outputTokens,
      });
    }
    if (command.totalTokens < 0) {
      throw new InvalidUsageDataError('Total tokens cannot be negative', {
        totalTokens: command.totalTokens,
      });
    }
  }

  private async calculateCredits(
    cost: number | undefined,
  ): Promise<number | undefined> {
    if (cost === undefined) {
      return undefined;
    }

    try {
      const creditsPerEuro = await this.getCreditsPerEuroUseCase.execute();
      return cost * creditsPerEuro;
    } catch (error) {
      if (error instanceof PlatformConfigNotFoundError) {
        this.logger.warn(
          {
            error: error.message,
          },
          'Could not calculate credits consumed',
        );
        return undefined;
      }
      throw error;
    }
  }

  /**
   * Calculates cost in EUR based on the model's per-million-token pricing.
   * Returns undefined if the model has no cost information configured.
   */
  private calculateCost(command: CollectUsageCommand): number | undefined {
    const model = command.model;

    const inputTokenCost = model.inputTokenCost;
    const outputTokenCost = model.outputTokenCost;

    if (inputTokenCost === undefined || outputTokenCost === undefined) {
      this.logger.debug(
        {
          modelId: model.id,
          hasInputCost: inputTokenCost !== undefined,
          hasOutputCost: outputTokenCost !== undefined,
        },
        'No cost information available for model',
      );

      return undefined;
    }

    const inputCost = (command.inputTokens / 1_000_000) * inputTokenCost;
    const outputCost = (command.outputTokens / 1_000_000) * outputTokenCost;
    const totalCost = inputCost + outputCost;

    this.logger.debug(
      {
        modelId: model.id,
        inputTokens: command.inputTokens,
        outputTokens: command.outputTokens,
        inputTokenCost: model.inputTokenCost,
        outputTokenCost: model.outputTokenCost,
        inputCost,
        outputCost,
        totalCost,
      },
      'Cost calculated for usage (EUR)',
    );

    return totalCost;
  }
}
