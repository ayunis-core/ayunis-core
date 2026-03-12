import { Injectable, Logger } from '@nestjs/common';
import { GetGlobalUserUsageQuery } from './get-global-user-usage.query';
import { UsageRepository } from '../../ports/usage.repository';
import { GlobalUserUsageItem } from '../../../domain/global-user-usage-item.entity';
import { validateOptionalDateRange } from '../../usage.utils';
import { UnexpectedUsageError } from '../../usage.errors';
import { ApplicationError } from '../../../../../common/errors/base.error';

@Injectable()
export class GetGlobalUserUsageUseCase {
  private readonly logger = new Logger(GetGlobalUserUsageUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  async execute(
    query: GetGlobalUserUsageQuery,
  ): Promise<GlobalUserUsageItem[]> {
    validateOptionalDateRange(query.startDate, query.endDate);

    try {
      return await this.usageRepository.getGlobalUserUsage(query);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to get global user usage', error);
      throw new UnexpectedUsageError(error as Error);
    }
  }
}
