import { Injectable, Logger } from '@nestjs/common';
import { GetProviderUsageQuery } from './get-provider-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import {
  validateOptionalDateRange,
  calculateProviderPercentages,
} from '../../usage.utils';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';

@Injectable()
export class GetProviderUsageUseCase {
  private readonly logger = new Logger(GetProviderUsageUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetProviderUsageQuery): Promise<ProviderUsage[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    this.logger.log('Getting provider usage', {
      organizationId: query.organizationId,
      startDate: query.startDate?.toISOString(),
      endDate: query.endDate?.toISOString(),
    });

    try {
      const providerUsage = await this.usageRepository.getProviderUsage(query);
      return calculateProviderPercentages(providerUsage);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get provider usage', error);
      throw new UnexpectedUsageError(error as Error, {
        organizationId: query.organizationId,
      });
    }
  }
}
