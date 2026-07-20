import type { UUID } from 'crypto';
import type { User } from 'src/iam/users/domain/user.entity';
import type { UserCreditLimitOverviewItem } from './user-credit-limit.view';
import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { GetMonthlyCreditUsageForUsersUseCase } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.use-case';
import { GetMonthlyCreditUsageForUsersQuery } from 'src/domain/usage/application/use-cases/get-monthly-credit-usage-for-users/get-monthly-credit-usage-for-users.query';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import type { UserCreditLimit } from 'src/iam/credit-limits/domain/user-credit-limit.entity';
import { selectUserCreditLimits } from '../../utils/select-user-credit-limits';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';

@Injectable()
export class GetUserCreditLimitsOverviewUseCase {
  private readonly logger = new Logger(GetUserCreditLimitsOverviewUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase,
    private readonly getMonthlyCreditUsageForUsersUseCase: GetMonthlyCreditUsageForUsersUseCase,
  ) {}

  async execute(): Promise<UserCreditLimitOverviewItem[]> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('Listing user credit limits', { orgId });

    try {
      const limits = await this.creditLimitRepository.findUserLimits(orgId);
      return await this.enrich(orgId, limits);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to list user credit limits', {
        error: error as Error,
      });
      throw new UnexpectedCreditLimitError(error);
    }
  }

  private async enrich(
    orgId: UUID,
    limits: UserCreditLimit[],
  ): Promise<UserCreditLimitOverviewItem[]> {
    const userLimits = selectUserCreditLimits(limits);
    if (userLimits.length === 0) {
      return [];
    }

    const userIds = userLimits.map((userLimit) => userLimit.userId);
    const [users, creditsUsedByUser] = await Promise.all([
      this.findUsersByIdsUseCase.execute(new FindUsersByIdsQuery(userIds)),
      this.getMonthlyCreditUsageForUsersUseCase.execute(
        new GetMonthlyCreditUsageForUsersQuery(orgId, userIds),
      ),
    ]);

    const userById = new Map<UUID, User>();
    for (const user of users) {
      userById.set(user.id, user);
    }

    return userLimits.map(({ userId, monthlyCredits }) => {
      const user = userById.get(userId);
      return {
        userId,
        name: user?.name ?? '',
        email: user?.email ?? '',
        monthlyCredits,
        creditsUsed: user ? (creditsUsedByUser.get(userId) ?? 0) : 0,
      };
    });
  }
}
