import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
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

  async execute(command: RemoveOrgCreditLimitsCommand): Promise<void> {
    this.logger.log(
      {
        orgId: command.orgId,
      },
      'Removing all credit limits for org',
    );

    try {
      await this.creditLimitRepository.deleteByOrg(command.orgId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to remove org credit limits',
      );
      throw new UnexpectedCreditLimitError(error);
    }
  }
}
