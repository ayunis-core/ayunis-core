import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CollectUsageCommand } from './collect-usage.command';
import { Usage } from '../../../domain/usage.entity';
import { UsageRepository } from '../../ports/usage.repository';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';
import { ModelsRepository } from '../../../../models/application/ports/models.repository';
import {
  InvalidUsageDataError,
  UsageCollectionFailedError,
} from '../../usage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';

@Injectable()
export class CollectUsageUseCase {
  private readonly logger = new Logger(CollectUsageUseCase.name);

  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly configService: ConfigService,
    private readonly modelsRepository: ModelsRepository,
  ) {}

  async execute(command: CollectUsageCommand): Promise<void> {
    this.logger.log('CollectUsageUseCase.execute called', {
      userId: command.userId,
      organizationId: command.organizationId,
      modelId: command.modelId,
      provider: command.provider,
      totalTokens: command.totalTokens,
    });

    try {
      this.validateCommand(command);

      const { cost, currency } = await this.calculateCost(command);

      const usage = new Usage({
        userId: command.userId,
        organizationId: command.organizationId,
        modelId: command.modelId,
        provider: command.provider,
        inputTokens: command.inputTokens,
        outputTokens: command.outputTokens,
        totalTokens: command.totalTokens,
        cost,
        currency,
        requestId: command.requestId,
      });

      await this.usageRepository.save(usage);

      this.logger.log('Usage collected successfully', {
        userId: command.userId,
        organizationId: command.organizationId,
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
      throw new UsageCollectionFailedError(
        error instanceof Error ? error.message : 'Unknown error',
        {
          userId: command.userId,
          organizationId: command.organizationId,
          modelId: command.modelId,
          error: error instanceof Error ? error.message : 'Unknown error',
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

    // Business rule: total tokens should equal input + output tokens
    const calculatedTotal = command.inputTokens + command.outputTokens;
    if (command.totalTokens !== calculatedTotal) {
      throw new InvalidUsageDataError(
        `Total tokens (${command.totalTokens}) must equal input tokens (${command.inputTokens}) + output tokens (${command.outputTokens})`,
        {
          totalTokens: command.totalTokens,
          inputTokens: command.inputTokens,
          outputTokens: command.outputTokens,
          calculatedTotal,
        },
      );
    }
  }

  private async calculateCost(
    command: CollectUsageCommand,
  ): Promise<{ cost?: number; currency?: string }> {
    const isSelfHosted = this.configService.get<boolean>('app.isSelfHosted');

    if (!isSelfHosted) {
      return { cost: undefined, currency: undefined };
    }

    try {
      const model = await this.modelsRepository.findOneLanguage(
        command.modelId,
      );

      if (!model || !model.inputTokenCost || !model.outputTokenCost) {
        this.logger.debug('No cost information available for model', {
          modelId: command.modelId,
          hasModel: !!model,
          hasInputCost: !!model?.inputTokenCost,
          hasOutputCost: !!model?.outputTokenCost,
        });

        return { cost: undefined, currency: undefined };
      }

      const inputCost = (command.inputTokens / 1000) * model.inputTokenCost;
      const outputCost = (command.outputTokens / 1000) * model.outputTokenCost;
      const totalCost = inputCost + outputCost;

      // Only return cost if it's above the minimum threshold
      const finalCost =
        totalCost >= UsageConstants.MIN_COST_THRESHOLD ? totalCost : 0;

      this.logger.debug('Cost calculated for usage', {
        modelId: command.modelId,
        inputTokens: command.inputTokens,
        outputTokens: command.outputTokens,
        inputTokenCost: model.inputTokenCost,
        outputTokenCost: model.outputTokenCost,
        inputCost,
        outputCost,
        totalCost,
        finalCost,
        currency: model.currency,
      });

      return {
        cost: finalCost,
        currency: model.currency,
      };
    } catch (error) {
      this.logger.error('Failed to calculate cost for usage', {
        error: error as Error,
        modelId: command.modelId,
      });

      // Return no cost information if calculation fails
      return { cost: undefined, currency: undefined };
    }
  }
}
