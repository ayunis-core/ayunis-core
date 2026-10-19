import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import type { DefaultUserCreditLimit } from 'src/iam/credit-limits/domain/default-user-credit-limit.entity';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';

@Injectable()
export class GetDefaultUserCreditLimitUseCase {
  private readonly logger = new Logger(GetDefaultUserCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(): Promise<DefaultUserCreditLimit | null> {
    const orgId = getRequiredOrgId(this.contextService);
    this.logger.log({ orgId }, 'Getting default user credit limit');

    return this.creditLimitRepository.findDefaultUserLimit(orgId);
  }
}
