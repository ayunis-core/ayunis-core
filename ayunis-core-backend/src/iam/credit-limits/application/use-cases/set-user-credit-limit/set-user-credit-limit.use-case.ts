import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { UserCreditLimit } from 'src/iam/credit-limits/domain/user-credit-limit.entity';
import {
  CreditLimitTargetNotFoundError,
  InvalidCreditLimitError,
  UnexpectedCreditLimitError,
} from '../../credit-limits.errors';
import { isNonNegativeFinite } from 'src/common/util/number.util';
import { FindUsersByIdsUseCase } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.use-case';
import { FindUsersByIdsQuery } from 'src/iam/users/application/use-cases/find-users-by-ids/find-users-by-ids.query';
import { SetUserCreditLimitCommand } from './set-user-credit-limit.command';

@Injectable()
export class SetUserCreditLimitUseCase {
  private readonly logger = new Logger(SetUserCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly findUsersByIdsUseCase: FindUsersByIdsUseCase,
  ) {}

  async execute(command: SetUserCreditLimitCommand): Promise<UserCreditLimit> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }
    if (!isNonNegativeFinite(command.monthlyCredits)) {
      throw new InvalidCreditLimitError(
        'monthlyCredits must be a number greater than or equal to 0',
        { monthlyCredits: command.monthlyCredits },
      );
    }

    this.logger.log('Setting user credit limit', {
      orgId,
      userId: command.userId,
      monthlyCredits: command.monthlyCredits,
    });

    try {
      const members = await this.findUsersByIdsUseCase.execute(
        new FindUsersByIdsQuery([command.userId]),
      );
      if (members.length === 0) {
        throw new CreditLimitTargetNotFoundError({
          userId: command.userId,
        });
      }

      const existing = await this.creditLimitRepository.findByUserId(
        orgId,
        command.userId,
      );

      const limit = new UserCreditLimit({
        id: existing?.id,
        orgId,
        userId: command.userId,
        monthlyCredits: command.monthlyCredits,
        createdAt: existing?.createdAt,
      });

      return await this.creditLimitRepository.save(limit);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to set user credit limit', {
        error: error as Error,
      });
      throw new UnexpectedCreditLimitError(error);
    }
  }
}
