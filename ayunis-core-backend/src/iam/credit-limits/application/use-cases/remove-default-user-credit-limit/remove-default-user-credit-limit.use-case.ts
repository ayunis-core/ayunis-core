import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';

@Injectable()
export class RemoveDefaultUserCreditLimitUseCase {
  private readonly logger = new Logger(
    RemoveDefaultUserCreditLimitUseCase.name,
  );

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(): Promise<void> {
    const orgId = getRequiredOrgId(this.contextService);
    this.logger.log({ orgId }, 'Removing default user credit limit');

    await this.creditLimitRepository.deleteDefaultUserLimit(orgId);
  }
}
