import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { isNonNegativeFinite } from 'src/common/util/number.util';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { DefaultUserCreditLimit } from 'src/iam/credit-limits/domain/default-user-credit-limit.entity';
import {
  InvalidCreditLimitError,
  UnexpectedCreditLimitError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { SetDefaultUserCreditLimitCommand } from './set-default-user-credit-limit.command';

@Injectable()
export class SetDefaultUserCreditLimitUseCase {
  private readonly logger = new Logger(SetDefaultUserCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(
    command: SetDefaultUserCreditLimitCommand,
  ): Promise<DefaultUserCreditLimit> {
    const orgId = getRequiredOrgId(this.contextService);
    if (!isNonNegativeFinite(command.monthlyCredits)) {
      throw new InvalidCreditLimitError(
        'monthlyCredits must be a number greater than or equal to 0',
        { monthlyCredits: command.monthlyCredits },
      );
    }

    this.logger.log(
      { orgId, monthlyCredits: command.monthlyCredits },
      'Setting default user credit limit',
    );

    const existing =
      await this.creditLimitRepository.findDefaultUserLimit(orgId);

    return this.creditLimitRepository.save(
      new DefaultUserCreditLimit({
        id: existing?.id,
        orgId,
        monthlyCredits: command.monthlyCredits,
        createdAt: existing?.createdAt,
      }),
    );
  }
}
