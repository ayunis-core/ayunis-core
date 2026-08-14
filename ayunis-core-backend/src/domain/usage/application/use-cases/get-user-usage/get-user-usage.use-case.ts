import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
import { UsageConstants } from 'src/domain/usage/domain/value-objects/usage.constants';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class GetUserUsageUseCase {
  constructor(
    private readonly usageRepository: UsageRepository,
    @InjectPinoLogger(GetUserUsageUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  async execute(query: GetUserUsageQuery): Promise<UserUsageResult> {
    this.validateQuery(query);

    try {
      return await this.usageRepository.getUserUsage(query);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error instanceof Error ? error : new Error(String(error)) },
        'Failed to get user usage',
      );
      throw new UnexpectedUsageError(error as Error, {
        organizationId: query.organizationId,
      });
    }
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
