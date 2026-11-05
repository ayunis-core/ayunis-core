import { Injectable, Logger } from '@nestjs/common';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedTeamError } from 'src/iam/teams/application/teams.errors';
import { TEAM_SCOPED_PERMISSIONS } from 'src/iam/teams/application/models/team-access.model';
import { GetTeamUseCase } from 'src/iam/teams/application/use-cases/get-team/get-team.use-case';
import { GetTeamQuery } from 'src/iam/teams/application/use-cases/get-team/get-team.query';
import { GetMyPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.use-case';
import { GetMyPermissionsQuery } from 'src/iam/permissions/application/use-cases/get-my-permissions/get-my-permissions.query';
import type { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { GetTeamRolePermissionsQuery } from './get-team-role-permissions.query';

export interface TeamRolePermissions {
  role: UserRole;
  permissions: Permission[];
}

const TEAM_ROLES = [UserRole.USER, UserRole.MANAGER, UserRole.ADMIN];

/**
 * What each team role grants within the team, read from the organisation's
 * role matrix. Unlike the matrix itself, this is readable by anyone who
 * manages the team's members, so team admins can see what a role means.
 */
@Injectable()
export class GetTeamRolePermissionsUseCase {
  private readonly logger = new Logger(GetTeamRolePermissionsUseCase.name);

  constructor(
    private readonly getTeamUseCase: GetTeamUseCase,
    private readonly getMyPermissionsUseCase: GetMyPermissionsUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedTeamError)
  async execute(
    query: GetTeamRolePermissionsQuery,
  ): Promise<TeamRolePermissions[]> {
    const { orgId } = getRequiredUserContext(this.context);
    this.logger.log({ teamId: query.teamId }, 'Getting team role permissions');

    await this.getTeamUseCase.execute(new GetTeamQuery(query.teamId));
    return Promise.all(
      TEAM_ROLES.map(async (role) => {
        const permissions = await this.getMyPermissionsUseCase.execute(
          new GetMyPermissionsQuery(orgId, role),
        );
        return {
          role,
          permissions: TEAM_SCOPED_PERMISSIONS.filter((permission) =>
            permissions.includes(permission),
          ),
        };
      }),
    );
  }
}
