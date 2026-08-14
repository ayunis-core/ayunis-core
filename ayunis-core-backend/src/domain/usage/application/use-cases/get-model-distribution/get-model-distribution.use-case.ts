import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetModelDistributionQuery } from './get-model-distribution.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ModelDistribution } from 'src/domain/usage/domain/model-distribution.entity';
import {
  InvalidDateRangeError,
  UnexpectedUsageError,
} from '../../usage.errors';
import {
  validateOptionalDateRange,
  processModelDistribution,
} from '../../usage.utils';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetModelDistributionUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    @InjectPinoLogger(GetModelDistributionUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(
    query: GetModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    if (query.maxModels <= 0) {
      throw new InvalidDateRangeError('Max models must be greater than 0');
    }

    this.logger.info(
      {
        organizationId: query.organizationId,
        maxModels: query.maxModels,
        modelId: query.modelId,
        startDate: query.startDate?.toISOString(),
        endDate: query.endDate?.toISOString(),
      },
      'Getting model distribution',
    );

    try {
      const modelDistribution = await this.usageRepository.getModelDistribution(
        {
          organizationId: query.organizationId,
          startDate: query.startDate,
          endDate: query.endDate,
          maxModels: query.maxModels,
          modelId: query.modelId,
        },
      );

      return processModelDistribution(modelDistribution, query.maxModels);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get model distribution',
      );
      throw new UnexpectedUsageError(error as Error, {
        organizationId: query.organizationId,
        maxModels: query.maxModels,
      });
    }
  }
}
