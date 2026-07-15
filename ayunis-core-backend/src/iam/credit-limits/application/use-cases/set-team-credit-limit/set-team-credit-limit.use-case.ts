import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreditLimitRepository } from '../../ports/credit-limit.repository';
import { TeamCreditLimit } from '../../../domain/team-credit-limit.entity';
import {
  InvalidCreditLimitError,
  UnexpectedCreditLimitError,
} from '../../credit-limits.errors';
import { isNonNegativeFinite } from 'src/common/util/number.util';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';
import { SetTeamCreditLimitCommand } from './set-team-credit-limit.command';

@Injectable()
export class SetTeamCreditLimitUseCase {
  private readonly logger = new Logger(SetTeamCreditLimitUseCase.name);

  constructor(
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly getTeamUseCase: GetTeamUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(command: SetTeamCreditLimitCommand): Promise<TeamCreditLimit> {
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

    this.logger.log('Setting team credit limit', {
      orgId,
      teamId: command.teamId,
      monthlyCredits: command.monthlyCredits,
    });

    await this.getTeamUseCase.execute(new GetTeamQuery(command.teamId));

    const existing = await this.creditLimitRepository.findByTeamId(
      orgId,
      command.teamId,
    );

    const limit = new TeamCreditLimit({
      id: existing?.id,
      orgId,
      teamId: command.teamId,
      monthlyCredits: command.monthlyCredits,
      createdAt: existing?.createdAt,
    });

    return await this.creditLimitRepository.save(limit);
  }
}
