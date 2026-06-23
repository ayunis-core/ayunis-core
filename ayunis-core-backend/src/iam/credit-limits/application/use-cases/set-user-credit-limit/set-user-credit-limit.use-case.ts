import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { CreditLimit } from '../../../domain/credit-limit.entity';
import {
  InvalidCreditLimitError,
  UnexpectedCreditLimitError,
} from '../../credit-limits.errors';
import { SetUserCreditLimitCommand } from './set-user-credit-limit.command';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { UserNotFoundError } from 'src/iam/users/application/users.errors';

// Upserts by (orgId, userId), reusing the existing row's id so re-setting a
// limit updates rather than violates the unique index.
@Injectable()
export class SetUserCreditLimitUseCase {
  private readonly logger = new Logger(SetUserCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly findUserByIdUseCase: FindUserByIdUseCase,
  ) {}

  async execute(command: SetUserCreditLimitCommand): Promise<CreditLimit> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log('Setting user credit limit', {
      orgId,
      targetUserId: command.targetUserId,
      monthlyCredits: command.monthlyCredits,
    });

    try {
      this.validateMonthlyCredits(command.monthlyCredits);
      await this.assertUserBelongsToOrg(command.targetUserId, orgId);

      const existing = await this.creditLimitRepository.findByUserId(
        orgId,
        command.targetUserId,
      );

      const limit = existing
        ? new CreditLimit({
            id: existing.id,
            orgId,
            scope: existing.scope,
            targetUserId: command.targetUserId,
            monthlyCredits: command.monthlyCredits,
            createdAt: existing.createdAt,
          })
        : CreditLimit.forUser(
            orgId,
            command.targetUserId,
            command.monthlyCredits,
          );

      return await this.creditLimitRepository.save(limit);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to set user credit limit', {
        error: error as Error,
      });
      throw new UnexpectedCreditLimitError(error);
    }
  }

  private validateMonthlyCredits(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new InvalidCreditLimitError(
        'monthlyCredits must be a number greater than or equal to 0',
        { monthlyCredits: value },
      );
    }
  }

  private async assertUserBelongsToOrg(
    userId: UUID,
    orgId: UUID,
  ): Promise<void> {
    const user = await this.findUserByIdUseCase.execute(
      new FindUserByIdQuery(userId),
    );
    if (user.orgId !== orgId) {
      throw new UserNotFoundError(userId);
    }
  }
}
