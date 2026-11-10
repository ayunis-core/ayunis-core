import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { WorkspaceMemberProfile } from 'src/domain/workspaces/application/models/workspace-member-profile.model';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceMemberProfilesService } from 'src/domain/workspaces/application/services/workspace-member-profiles.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceMemberNotInOrgError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { AddWorkspaceMembersCommand } from './add-workspace-members.command';

/**
 * Adds users of the caller's organization with one role. Users who already
 * are members are skipped and keep their role, since only admins change roles.
 */
@Injectable()
export class AddWorkspaceMembersUseCase {
  private readonly logger = new Logger(AddWorkspaceMembersUseCase.name);

  constructor(
    private readonly membersRepository: WorkspaceMembersRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly profiles: WorkspaceMemberProfilesService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: AddWorkspaceMembersCommand,
  ): Promise<WorkspaceMemberProfile[]> {
    const { workspaceId, role } = command;
    const userIds = [...new Set(command.userIds)];
    this.logger.log(
      { workspaceId, role, count: userIds.length },
      'Adding workspace members',
    );

    const access = await this.workspaceAccess.requirePermission(
      workspaceId,
      Permission.MANAGE_WORKSPACE_MEMBERS,
    );
    if (role === UserRole.ADMIN && !access.isAdmin) {
      throw new UnauthorizedAccessError({ workspaceId });
    }

    const candidates = userIds.map(
      (userId) => new WorkspaceMember({ workspaceId, userId, role }),
    );
    const profiles = await this.profiles.load(candidates);
    if (profiles.length < candidates.length) {
      const known = new Set(profiles.map(({ member }) => member.userId));
      throw new WorkspaceMemberNotInOrgError(
        userIds.filter((userId) => !known.has(userId)),
      );
    }

    const added = new Set(
      (await this.membersRepository.addMany(candidates)).map(
        (member) => member.id,
      ),
    );
    return profiles.filter(({ member }) => added.has(member.id));
  }
}
