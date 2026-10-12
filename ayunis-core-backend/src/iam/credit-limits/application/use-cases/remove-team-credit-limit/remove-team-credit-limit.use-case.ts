import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { AssertTeamManagementAllowedUseCase } from 'src/iam/teams/application/use-cases/assert-team-management-allowed/assert-team-management-allowed.use-case';
import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { CreditLimitRepository } from 'src/iam/credit-limits/application/ports/credit-limit.repository';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { RemoveTeamCreditLimitCommand } from './remove-team-credit-limit.command';
import { getRequiredOrgId } from 'src/common/context/required-context';

@Injectable()
export class RemoveTeamCreditLimitUseCase {
  private readonly logger = new Logger(RemoveTeamCreditLimitUseCase.name);

  constructor(
    private readonly teamManagementAccess: AssertTeamManagementAllowedUseCase,
    private readonly creditLimitRepository: CreditLimitRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(command: RemoveTeamCreditLimitCommand): Promise<void> {
    const orgId = getRequiredOrgId(this.contextService, command.orgId);
    await this.teamManagementAccess.execute({ orgId });

    this.logger.log(
      {
        orgId,
        teamId: command.teamId,
      },
      'Removing team credit limit',
    );

    await this.creditLimitRepository.deleteByTeamId(orgId, command.teamId);
  }
}
