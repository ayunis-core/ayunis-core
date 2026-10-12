import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getRequiredUserContext,
  getSuperAdminContext,
} from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
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
    private readonly findOrg: FindOrgByIdUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedCreditLimitError)
  async execute(): Promise<AdminTeamCreditLimitOverviewItem[]> {
    const user = getRequiredUserContext(this.context);
    const orgId = user.orgId;
    this.logger.log({ orgId }, 'Getting admin team credit limits');
    const org = await this.findOrg.execute({ id: orgId });
    const items = await this.overview.execute();
    if (!org.hideIndividualUsage || getSuperAdminContext(this.context))
      return items;
    return items.map(({ teamId, name, monthlyCredits }) => ({
      teamId,
      name,
      monthlyCredits,
    }));
  }
}
