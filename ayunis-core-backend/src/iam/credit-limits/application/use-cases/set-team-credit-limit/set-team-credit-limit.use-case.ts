import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AssertTeamManagementAllowedUseCase } from 'src/iam/teams/application/use-cases/assert-team-management-allowed/assert-team-management-allowed.use-case';
import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { TeamCreditLimit } from 'src/iam/credit-limits/domain/team-credit-limit.entity';
import {
  InvalidCreditLimitError,
  UnexpectedCreditLimitError,
} from 'src/iam/credit-limits/application/credit-limits.errors';
import { isNonNegativeFinite } from 'src/common/util/number.util';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';
import { SetTeamCreditLimitCommand } from './set-team-credit-limit.command';
import { getRequiredOrgId } from 'src/common/context/required-context';

@Injectable()
export class SetTeamCreditLimitUseCase {
  private readonly logger = new Logger(SetTeamCreditLimitUseCase.name);

  constructor(
    private readonly teamManagementAccess: AssertTeamManagementAllowedUseCase,
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
    private readonly getTeamUseCase: GetTeamUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(command: SetTeamCreditLimitCommand): Promise<TeamCreditLimit> {
    const orgId = getRequiredOrgId(this.contextService, command.orgId);
    await this.teamManagementAccess.execute({ orgId });
    if (!isNonNegativeFinite(command.monthlyCredits)) {
      throw new InvalidCreditLimitError(
        'monthlyCredits must be a number greater than or equal to 0',
        { monthlyCredits: command.monthlyCredits },
      );
    }

    this.logger.log(
      {
        orgId,
        teamId: command.teamId,
        monthlyCredits: command.monthlyCredits,
      },
      'Setting team credit limit',
    );

    await this.getTeamUseCase.execute(
      new GetTeamQuery(command.teamId, command.orgId),
    );

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
