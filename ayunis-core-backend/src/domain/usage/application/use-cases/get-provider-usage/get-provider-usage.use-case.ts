import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GetProviderUsageQuery } from './get-provider-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { ProviderUsage } from 'src/domain/usage/domain/provider-usage.entity';
import {
  validateOptionalDateRange,
  calculateProviderPercentages,
} from '../../usage.utils';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetProviderUsageUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    @InjectPinoLogger(GetProviderUsageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(query: GetProviderUsageQuery): Promise<ProviderUsage[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    this.logger.info(
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
