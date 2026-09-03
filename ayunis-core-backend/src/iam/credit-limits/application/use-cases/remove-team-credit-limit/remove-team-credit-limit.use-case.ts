import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { RemoveTeamCreditLimitCommand } from './remove-team-credit-limit.command';

@Injectable()
export class RemoveTeamCreditLimitUseCase {
  private readonly logger = new Logger(RemoveTeamCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RemoveTeamCreditLimitCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.log(
      {
        orgId,
        teamId: command.teamId,
      },
      'Removing team credit limit',
    );

    try {
      await this.creditLimitRepository.deleteByTeamId(orgId, command.teamId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error(
        { err: error as Error },
        'Failed to remove team credit limit',
      );
      throw new UnexpectedCreditLimitError(error);
    }
  }
}
