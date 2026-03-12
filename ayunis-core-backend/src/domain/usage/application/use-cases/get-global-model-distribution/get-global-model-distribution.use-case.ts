import { Injectable, Logger } from '@nestjs/common';
import { GetGlobalModelDistributionQuery } from './get-global-model-distribution.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ModelDistribution } from '../../../domain/model-distribution.entity';
import {
  InvalidDateRangeError,
  UnexpectedUsageError,
} from '../../usage.errors';
import {
  validateOptionalDateRange,
  processModelDistribution,
} from '../../usage.utils';
import { ApplicationError } from '../../../../../common/errors/base.error';

@Injectable()
export class GetGlobalModelDistributionUseCase {
  private readonly logger = new Logger(GetGlobalModelDistributionUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetGlobalModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    if (query.maxModels <= 0) {
      throw new InvalidDateRangeError('Max models must be greater than 0');
    }

    try {
      const modelDistribution =
        await this.usageRepository.getGlobalModelDistribution(query);

      return processModelDistribution(modelDistribution, query.maxModels);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get global model distribution', error);
      throw new UnexpectedUsageError(error as Error);
    }
  }
}
