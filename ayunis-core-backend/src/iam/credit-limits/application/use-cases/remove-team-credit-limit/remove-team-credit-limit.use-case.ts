import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApplicationError } from 'src/common/errors/base.error';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { UnexpectedCreditLimitError } from '../../credit-limits.errors';
import { RemoveTeamCreditLimitCommand } from './remove-team-credit-limit.command';

@Injectable()
export class RemoveTeamCreditLimitUseCase {
  constructor(
    @InjectPinoLogger(RemoveTeamCreditLimitUseCase.name)
    private readonly logger: PinoLogger,
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: RemoveTeamCreditLimitCommand): Promise<void> {
    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    this.logger.info(
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
