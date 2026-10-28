import { Injectable, Logger } from '@nestjs/common';
import { GetUserUsageQuery } from './get-user-usage.query';
import {
  UsageRepository,
  type UserUsageResult,
} from 'src/domain/usage/application/ports/usage.repository';
import {
  InvalidPaginationError,
  UnexpectedUsageError,
} from 'src/domain/usage/application/usage.errors';
import { validateOptionalDateRange } from 'src/domain/usage/application/usage.utils';
import { UsageConstants } from 'src/domain/usage/domain/value-objects/usage.constants';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import {
  getRequiredUserContext,
  getSuperAdminContext,
} from 'src/common/context/required-context';
import { IndividualUsageForbiddenError } from 'src/domain/usage/application/usage.errors';

@Injectable()
export class GetUserUsageUseCase {
  private readonly logger = new Logger(GetUserUsageUseCase.name);

  constructor(
    private readonly usageRepository: UsageRepository,
    private readonly findOrg: FindOrgByIdUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedUsageError)
  async execute(query: GetUserUsageQuery): Promise<UserUsageResult> {
    this.logger.log(
      { organizationId: query.organizationId },
      'Getting user usage',
    );
    this.validateQuery(query);
    if (!getSuperAdminContext(this.context)) {
      const user = getRequiredUserContext(this.context);
      if (user.orgId !== query.organizationId) {
        throw new IndividualUsageForbiddenError();
      }
      const org = await this.findOrg.execute({ id: query.organizationId });
      if (org.hideIndividualUsage) throw new IndividualUsageForbiddenError();
    }
    return this.usageRepository.getUserUsage(query);
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
