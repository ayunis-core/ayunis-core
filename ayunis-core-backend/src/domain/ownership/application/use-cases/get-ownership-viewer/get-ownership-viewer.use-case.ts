import { Injectable } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedOwnershipError } from 'src/domain/ownership/application/ownership.errors';
import { OwnershipViewer } from 'src/domain/ownership/application/models/ownership-viewer';
import { GetMyPermissionsQuery } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.query';
import { GetMyPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.use-case';
import { GetTeamAdminPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-team-admin-permissions/get-team-admin-permissions.use-case';
import { FindAdministeredTeamIdsUseCase } from 'src/iam/teams/application/use-cases/find-administered-team-ids/find-administered-team-ids.use-case';
import { ListMyTeamsUseCase } from 'src/iam/teams/application/use-cases/list-my-teams/list-my-teams.use-case';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@Injectable()
export class GetOwnershipViewerUseCase {
  constructor(
    private readonly context: ContextService,
    private readonly getMyPermissions: GetMyPermissionsUseCase,
    private readonly getTeamAdminPermissions: GetTeamAdminPermissionsUseCase,
    private readonly listMyTeams: ListMyTeamsUseCase,
    private readonly findAdministeredTeamIds: FindAdministeredTeamIdsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOwnershipError)
  async execute(): Promise<OwnershipViewer> {
    const { userId, orgId, role } = getRequiredUserContext(this.context);
    const [permissions, teamAdminPermissions, teams, adminTeamIds] =
      await Promise.all([
        this.getMyPermissions.execute(new GetMyPermissionsQuery(orgId, role)),
        this.getTeamAdminPermissions.execute(orgId),
        this.listMyTeams.execute(),
        this.findAdministeredTeamIds.execute(),
      ]);
    return new OwnershipViewer({
      userId,
      orgId,
      isAdmin: role === UserRole.ADMIN,
      permissions,
      memberTeamIds: teams.map(({ id }) => id),
      adminTeamIds,
      teamAdminPermissions,
    });
  }
}
