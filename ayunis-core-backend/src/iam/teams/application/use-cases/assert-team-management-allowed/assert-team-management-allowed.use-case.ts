import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getSuperAdminContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { FindOrgByIdUseCase } from 'src/iam/orgs/application/use-cases/find-org-by-id/find-org-by-id.use-case';
import { FindUserByIdUseCase } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.use-case';
import { FindUserByIdQuery } from 'src/iam/users/application/use-cases/find-user-by-id/find-user-by-id.query';
import { SystemRole } from 'src/iam/users/domain/value-objects/system-role.enum';
import {
  TeamManagementRestrictedError,
  UnexpectedTeamError,
} from 'src/iam/teams/application/teams.errors';

@Injectable()
export class AssertTeamManagementAllowedUseCase {
  private readonly logger = new Logger(AssertTeamManagementAllowedUseCase.name);
  constructor(
    private readonly context: ContextService,
    private readonly findOrg: FindOrgByIdUseCase,
    private readonly findUser: FindUserByIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(query: { orgId: UUID; inviterId?: UUID }): Promise<void> {
    this.logger.log({ orgId: query.orgId }, 'Checking team management access');
    if (getSuperAdminContext(this.context)) return;
    const org = await this.findOrg.execute({ id: query.orgId });
    if (!org.hideIndividualUsage) return;
    // Public invite/SSO acceptance uses the inviter from the persisted invite,
    // never an actor supplied by the HTTP request.
    if (query.inviterId) {
      const inviter = await this.findUser.execute(
        new FindUserByIdQuery(query.inviterId),
      );
      if (inviter.systemRole === SystemRole.SUPER_ADMIN) return;
    }
    throw new TeamManagementRestrictedError();
  }
}
