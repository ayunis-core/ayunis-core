import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';
import { RemoveOrgCreditLimitsCommand } from './remove-org-credit-limits.command';

/**
 * Removes every credit limit configured for an org. Triggered when the org
 * leaves the usage-based plan (its limits no longer apply), so `orgId` comes
 * from the command rather than request context.
 */
@Injectable()
export class RemoveOrgCreditLimitsUseCase {
  private readonly logger = new Logger(RemoveOrgCreditLimitsUseCase.name);

  constructor(private readonly creditLimitRepository: CreditLimitRepository) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(command: RemoveOrgCreditLimitsCommand): Promise<void> {
    this.logger.log('Removing all credit limits for org', {
      orgId: command.orgId,
    });

    await this.creditLimitRepository.deleteByOrg(command.orgId);
  }
}
