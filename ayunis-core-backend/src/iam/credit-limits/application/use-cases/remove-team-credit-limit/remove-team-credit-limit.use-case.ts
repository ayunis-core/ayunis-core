import { Injectable, Logger } from '@nestjs/common';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';
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

    this.logger.log('Removing team credit limit', {
      orgId,
      teamId: command.teamId,
    });

    try {
      await this.creditLimitRepository.deleteByTeamId(orgId, command.teamId);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      this.logger.error('Failed to remove team credit limit', {
        error: error as Error,
      });
      throw new UnexpectedCreditLimitError(error);
    }
  }
}
