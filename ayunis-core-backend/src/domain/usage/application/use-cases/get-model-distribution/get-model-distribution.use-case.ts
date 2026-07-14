import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetModelDistributionQuery } from './get-model-distribution.query';
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

@Injectable()
export class GetModelDistributionUseCase {
  private readonly logger = new Logger(GetModelDistributionUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(
    query: GetModelDistributionQuery,
  ): Promise<ModelDistribution[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    if (query.maxModels <= 0) {
      throw new InvalidDateRangeError('Max models must be greater than 0');
    }

    this.logger.log('Getting model distribution', {
      organizationId: query.organizationId,
      maxModels: query.maxModels,
      modelId: query.modelId,
      startDate: query.startDate?.toISOString(),
      endDate: query.endDate?.toISOString(),
    });

    const modelDistribution = await this.usageRepository.getModelDistribution({
      organizationId: query.organizationId,
      startDate: query.startDate,
      endDate: query.endDate,
      maxModels: query.maxModels,
      modelId: query.modelId,
    });

    return processModelDistribution(modelDistribution, query.maxModels);
  }
}
