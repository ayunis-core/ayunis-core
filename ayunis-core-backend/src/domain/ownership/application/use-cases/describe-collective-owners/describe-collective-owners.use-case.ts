import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { OWNERSHIP_RIGHTS } from 'src/domain/ownership/application/models/owned-resource-kind';
import { UnexpectedOwnershipError } from 'src/domain/ownership/application/ownership.errors';
import { GetRolePermissionsQuery } from 'src/iam/permissions/application/use-cases/get-role-permissions/get-role-permissions.query';
import { GetRolePermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-role-permissions/get-role-permissions.use-case';
import { GetTeamAdminPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-team-admin-permissions/get-team-admin-permissions.use-case';
import { DescribeTeamsQuery } from 'src/iam/teams/application/use-cases/describe-teams/describe-teams.query';
import { DescribeTeamsUseCase } from 'src/iam/teams/application/use-cases/describe-teams/describe-teams.use-case';
import type { TeamAdminSummary } from 'src/iam/teams/domain/team-admin-summary';
import { CountUsersByOrgIdQuery } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.query';
import { CountUsersByOrgIdUseCase } from 'src/iam/users/application/use-cases/count-users-by-org-id/count-users-by-org-id.use-case';
import { DescribeCollectiveOwnersQuery } from './describe-collective-owners.query';

export interface TeamOwnerDescription {
  teamId: UUID;
  name: string;
  memberCount: number;
  editors: TeamAdminSummary[];
}

export interface OrgOwnerDescription {
  memberCount: number;
  editorsIncludeNonAdmins: boolean;
}

export interface CollectiveOwnerDescriptions {
  teams: Map<UUID, TeamOwnerDescription>;
  org: OrgOwnerDescription | null;
}

@Injectable()
export class DescribeCollectiveOwnersUseCase {
  constructor(
    private readonly context: ContextService,
    private readonly describeTeams: DescribeTeamsUseCase,
    private readonly getTeamAdminPermissions: GetTeamAdminPermissionsUseCase,
    private readonly getRolePermissions: GetRolePermissionsUseCase,
    private readonly countUsers: CountUsersByOrgIdUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOwnershipError)
  async execute(
    query: DescribeCollectiveOwnersQuery,
  ): Promise<CollectiveOwnerDescriptions> {
    const { orgId } = getRequiredUserContext(this.context);
    const [teams, org] = await Promise.all([
      this.describeTeamOwners(query, orgId),
      query.includeOrg ? this.describeOrgOwner(query, orgId) : null,
    ]);
    return { teams, org };
  }

  private async describeTeamOwners(
    query: DescribeCollectiveOwnersQuery,
    orgId: UUID,
  ): Promise<Map<UUID, TeamOwnerDescription>> {
    if (query.teamIds.length === 0) return new Map();
    const [teams, teamAdminPermissions] = await Promise.all([
      this.describeTeams.execute(new DescribeTeamsQuery(orgId, query.teamIds)),
      this.getTeamAdminPermissions.execute(orgId),
    ]);
    const adminsMayEdit = teamAdminPermissions.includes(
      OWNERSHIP_RIGHTS[query.kind].team,
    );
    return new Map(
      teams.map((team) => [
        team.id,
        {
          teamId: team.id,
          name: team.name,
          memberCount: team.memberCount,
          editors: adminsMayEdit ? team.admins : [],
        },
      ]),
    );
  }

  private async describeOrgOwner(
    query: DescribeCollectiveOwnersQuery,
    orgId: UUID,
  ): Promise<OrgOwnerDescription> {
    const [memberCount, roles] = await Promise.all([
      this.countUsers.execute(new CountUsersByOrgIdQuery(orgId)),
      this.getRolePermissions.execute(new GetRolePermissionsQuery(orgId)),
    ]);
    const orgRight = OWNERSHIP_RIGHTS[query.kind].org;
    return {
      memberCount,
      editorsIncludeNonAdmins: roles.some(({ permissions }) =>
        permissions.includes(orgRight),
      ),
    };
  }
}
