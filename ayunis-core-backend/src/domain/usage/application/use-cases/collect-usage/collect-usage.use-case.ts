import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CollectUsageCommand } from './collect-usage.command';
import { Usage } from '../../../domain/usage.entity';
import { UsageRepository } from '../../ports/usage.repository';
import {
  InvalidUsageDataError,
  UsageCollectionFailedError,
  UnexpectedUsageError,
} from '../../usage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';
import { ContextService } from '../../../../../common/context/services/context.service';
import { Currency } from '../../../../models/domain/value-objects/currency.enum';

@Injectable()
export class CollectUsageUseCase {
  private readonly logger = new Logger(CollectUsageUseCase.name);

  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: CollectUsageCommand): Promise<void> {
    const userId = this.contextService.get('userId');
    const organizationId = this.contextService.get('orgId');

    if (!userId || !organizationId) {
      throw new UsageCollectionFailedError(
        'User ID or Organization ID not available in context',
        {
          userId: userId || undefined,
          organizationId: organizationId || undefined,
          modelId: command.modelId,
        },
      );
    }

    this.logger.log('CollectUsageUseCase.execute called', {
      userId,
      organizationId,
      modelId: command.modelId,
      provider: command.provider,
      totalTokens: command.totalTokens,
    });

    try {
      this.validateCommand(command);

      const { cost, currency } = this.calculateCost(command);

      const usage = new Usage({
        userId,
        organizationId,
        modelId: command.modelId,
        provider: command.provider,
        inputTokens: command.inputTokens,
        outputTokens: command.outputTokens,
        totalTokens: command.totalTokens,
        cost,
        currency,
        requestId: command.requestId || randomUUID(),
      });

      await this.usageRepository.save(usage);

      this.logger.log('Usage collected successfully', {
        userId,
        organizationId,
        modelId: command.modelId,
        provider: command.provider,
        totalTokens: command.totalTokens,
        cost,
        requestId: command.requestId,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Failed to collect usage', {
        error: error as Error,
        command,
      });
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

  private calculateCost(command: CollectUsageCommand): {
    cost?: number;
    currency?: Currency;
  } {
    const model = command.model;

    if (
      model.inputTokenCost === undefined ||
      model.outputTokenCost === undefined
    ) {
      this.logger.debug('No cost information available for model', {
        modelId: model.id,
        hasInputCost: model.inputTokenCost !== undefined,
        hasOutputCost: model.outputTokenCost !== undefined,
      });

      return { cost: undefined, currency: undefined };
    }

    const inputCost = (command.inputTokens / 1000) * model.inputTokenCost;
    const outputCost = (command.outputTokens / 1000) * model.outputTokenCost;
    const totalCost = inputCost + outputCost;

    this.logger.debug('Cost calculated for usage', {
      modelId: model.id,
      inputTokens: command.inputTokens,
      outputTokens: command.outputTokens,
      inputTokenCost: model.inputTokenCost,
      outputTokenCost: model.outputTokenCost,
      inputCost,
      outputCost,
      totalCost,
      currency: model.currency,
    });

    return {
      cost: totalCost,
      currency: model.currency,
    };
  }
}
