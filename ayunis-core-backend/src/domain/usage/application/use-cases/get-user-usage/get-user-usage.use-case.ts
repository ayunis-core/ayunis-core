import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { GetUserUsageQuery } from './get-user-usage.query';
import {
  UsageRepository,
  type UserUsageResult,
} from '../../ports/usage.repository';
import {
  InvalidPaginationError,
  UnexpectedUsageError,
} from '../../usage.errors';
import { validateOptionalDateRange } from '../../usage.utils';
import { UsageConstants } from '../../../domain/value-objects/usage.constants';

@Injectable()
export class GetUserUsageUseCase {
  private readonly logger = new Logger(GetUserUsageUseCase.name);

  constructor(private readonly usageRepository: UsageRepository) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(query: GetUserUsageQuery): Promise<UserUsageResult> {
    this.validateQuery(query);

    this.logger.log('Getting user usage', {
      organizationId: query.organizationId,
    });

    return await this.usageRepository.getUserUsage(query);
  }

  private validateQuery(query: GetUserUsageQuery): void {
    // Validate date range if provided
    validateOptionalDateRange(query.startDate, query.endDate);

    // Validate pagination
    if (query.limit <= 0) {
      throw new InvalidPaginationError(
        'Pagination limit must be greater than 0',
      );
    }

    if (query.limit > UsageConstants.MAX_USER_USAGE_LIMIT) {
      throw new InvalidPaginationError(
        `Pagination limit cannot exceed ${UsageConstants.MAX_USER_USAGE_LIMIT}`,
      );
    }

    if (query.offset < 0) {
      throw new InvalidPaginationError('Pagination offset cannot be negative');
    }

    // Validate sort parameters
    const validSortFields: Array<typeof query.sortBy> = [
      'credits',
      'requests',
      'lastActivity',
      'userName',
    ];
    if (!validSortFields.includes(query.sortBy)) {
      throw new InvalidPaginationError(`Invalid sort field: ${query.sortBy}`);
    }

    const validSortOrders: Array<typeof query.sortOrder> = ['asc', 'desc'];
    if (!validSortOrders.includes(query.sortOrder)) {
      throw new InvalidPaginationError(
        `Invalid sort order: ${query.sortOrder}`,
      );
    }
  }
}
