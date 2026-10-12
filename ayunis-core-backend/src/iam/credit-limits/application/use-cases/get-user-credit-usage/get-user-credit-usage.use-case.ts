import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getRequiredUserContext,
  getSuperAdminContext,
} from 'src/common/context/required-context';
import { GetMonthlyCreditUsageForUsersUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.use-case';
import { GetMonthlyCreditUsageForUsersQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.query';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { GetUserCreditUsageQuery } from './get-user-credit-usage.query';
import type { UserCreditUsageItem } from './user-credit-usage.view';

@Injectable()
export class GetUserCreditUsageUseCase {
  private readonly logger = new Logger(GetUserCreditUsageUseCase.name);

  constructor(
    private readonly findOrg: FindOrgByIdUseCase,
    private readonly contextService: ContextService,
    private readonly getMonthlyCreditUsageForUsersUseCase: GetMonthlyCreditUsageForUsersUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(
    query: GetUserCreditUsageQuery,
  ): Promise<UserCreditUsageItem[]> {
    const { orgId } = getRequiredUserContext(this.contextService);
    const userIds = [...new Set(query.userIds)];

    this.logger.log(
      { orgId, userCount: userIds.length },
      'Getting monthly credit usage for users',
    );

    if (userIds.length === 0) {
      return [];
    }

    const org = await this.findOrg.execute({ id: orgId });
    if (org.hideIndividualUsage && !getSuperAdminContext(this.contextService)) {
      return userIds.map((userId) => ({ userId }));
    }

    const creditsUsedByUser =
      await this.getMonthlyCreditUsageForUsersUseCase.execute(
        new GetMonthlyCreditUsageForUsersQuery(orgId, userIds),
      );

    return userIds.map((userId) => ({
      userId,
      creditsUsed: creditsUsedByUser.get(userId) ?? 0,
    }));
  }
}
