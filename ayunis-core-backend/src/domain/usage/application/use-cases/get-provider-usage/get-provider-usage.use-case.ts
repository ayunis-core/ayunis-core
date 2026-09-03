import { Injectable, Logger } from '@nestjs/common';
import { GetProviderUsageQuery } from './get-provider-usage.query';
import { UsageRepository } from 'src/domain/usage/application/ports/usage.repository';
import { ProviderUsage } from 'src/domain/usage/domain/provider-usage.entity';
import {
  validateOptionalDateRange,
  calculateProviderPercentages,
} from 'src/domain/usage/application/usage.utils';
import { UnexpectedUsageError } from 'src/domain/usage/application/usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetProviderUsageUseCase {
  private readonly logger = new Logger(GetProviderUsageUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(query: GetProviderUsageQuery): Promise<ProviderUsage[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    this.logger.log(
      {
        organizationId: query.organizationId,
        startDate: query.startDate?.toISOString(),
        endDate: query.endDate?.toISOString(),
      },
      'Getting provider usage',
    );

    try {
      const providerUsage = await this.usageRepository.getProviderUsage(query);
      return calculateProviderPercentages(providerUsage);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get provider usage',
      );
      throw new UnexpectedUsageError(error as Error, {
        organizationId: query.organizationId,
      });
    }
  }
}
