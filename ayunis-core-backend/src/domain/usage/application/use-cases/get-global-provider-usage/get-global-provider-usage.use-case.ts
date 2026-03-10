import { Injectable, Logger } from '@nestjs/common';
import { GetGlobalProviderUsageQuery } from './get-global-provider-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ProviderUsage } from '../../../domain/provider-usage.entity';
import {
  validateOptionalDateRange,
  calculateProviderPercentages,
} from '../../usage.utils';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';

@Injectable()
export class GetGlobalProviderUsageUseCase {
  private readonly logger = new Logger(GetGlobalProviderUsageUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetGlobalProviderUsageQuery): Promise<ProviderUsage[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    this.logger.log('Getting global provider usage', {
      startDate: query.startDate?.toISOString(),
      endDate: query.endDate?.toISOString(),
    });

    try {
      const providerUsage =
        await this.usageRepository.getGlobalProviderUsage(query);

      return calculateProviderPercentages(providerUsage);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get global provider usage', error);
      throw new UnexpectedUsageError(error as Error);
    }
  }
}
