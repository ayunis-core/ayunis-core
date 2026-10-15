import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type {
  WorkspaceInviters,
  WorkspaceSharingOverview,
} from 'src/domain/workspaces/application/models/workspace-sharing-view';
import { WorkspaceSharingContextService } from 'src/domain/workspaces/application/services/workspace-sharing-context.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { GetRolePermissionsQuery } from 'src/iam/permissions/application/use-cases/get-role-permissions/get-role-permissions.query';
import { GetRolePermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-role-permissions/get-role-permissions.use-case';
import { GetTeamAdminPermissionsUseCase } from 'src/iam/permissions/application/use-cases/get-team-admin-permissions/get-team-admin-permissions.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { TeamAdminPermission } from 'src/iam/permissions/domain/value-objects/team-admin-permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

@Injectable()
export class GetWorkspaceSharingUseCase {
  private readonly logger = new Logger(GetWorkspaceSharingUseCase.name);

  constructor(
    private readonly sharing: WorkspaceSharingContextService,
    private readonly context: ContextService,
    private readonly getRolePermissions: GetRolePermissionsUseCase,
    private readonly getTeamAdminPermissions: GetTeamAdminPermissionsUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(query: {
    workspaceId: UUID;
  }): Promise<WorkspaceSharingOverview> {
    this.logger.log(query, 'Getting workspace sharing');
    const [context, inviters] = await Promise.all([
      this.sharing.load(query.workspaceId),
      this.inviters(),
    ]);
    return { ...context.builder.view(), inviters };
  }

  private async inviters(): Promise<WorkspaceInviters> {
    const { orgId } = getRequiredUserContext(this.context);
    const [roles, teamAdminRights] = await Promise.all([
      this.getRolePermissions.execute(new GetRolePermissionsQuery(orgId)),
      this.getTeamAdminPermissions.execute(orgId),
    ]);
    return {
      managers: roles.some(
        ({ role, permissions }) =>
          role === UserRole.MANAGER &&
          permissions.includes(Permission.SHARE_WORKSPACES),
      ),
      teamAdmins: teamAdminRights.includes(
        TeamAdminPermission.TEAM_SHARE_WORKSPACES,
      ),
    };
  }
}
