import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedCreditLimitError } from 'src/iam/credit-limits/application/credit-limits.errors';
import { GetTeamCreditLimitsOverviewUseCase } from 'src/iam/credit-limits/application/use-cases/get-team-credit-limits-overview/get-team-credit-limits-overview.use-case';
import type { AdminTeamCreditLimitOverviewItem } from './admin-team-credit-limit.view';

@Injectable()
export class GetAdminTeamCreditLimitsOverviewUseCase {
  private readonly logger = new Logger(
    GetAdminTeamCreditLimitsOverviewUseCase.name,
  );
  constructor(
    private readonly overview: GetTeamCreditLimitsOverviewUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(): Promise<AdminTeamCreditLimitOverviewItem[]> {
    const user = getRequiredUserContext(this.context);
    const orgId = user.orgId;
    this.logger.log({ orgId }, 'Getting admin team credit limits');
    return this.overview.execute();
  }
}
