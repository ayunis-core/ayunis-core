import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  WORKSPACE_ROLES,
  type WorkspaceAccess,
} from 'src/domain/workspaces/application/models/workspace-access.model';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { GetWorkspaceRolePermissionsQuery } from './get-workspace-role-permissions.query';

/**
 * What each workspace role grants in the workspace, read from the
 * organisation's role matrix. Any member may read it, so everyone can see
 * what a role means.
 */
@Injectable()
export class GetWorkspaceRolePermissionsUseCase {
  private readonly logger = new Logger(GetWorkspaceRolePermissionsUseCase.name);

  constructor(private readonly workspaceAccess: WorkspaceAccessService) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    query: GetWorkspaceRolePermissionsQuery,
  ): Promise<WorkspaceAccess[]> {
    this.logger.log(
      { workspaceId: query.workspaceId },
      'Getting workspace role permissions',
    );
    await this.workspaceAccess.requireMember(query.workspaceId);
    const permissionsOf = this.workspaceAccess.rolePermissionsLoader();
    return Promise.all(
      WORKSPACE_ROLES.map((role) =>
        this.workspaceAccess.toAccess(role, permissionsOf),
      ),
    );
  }
}
