import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { WorkspaceMemberProfile } from 'src/domain/workspaces/application/models/workspace-member-profile.model';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { WorkspaceMemberProfilesService } from 'src/domain/workspaces/application/services/workspace-member-profiles.service';
import {
  UnexpectedWorkspaceError,
  WorkspaceLastAdminError,
  WorkspaceMemberNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import type { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';
import { UpdateWorkspaceMemberRoleCommand } from './update-workspace-member-role.command';

@Injectable()
export class UpdateWorkspaceMemberRoleUseCase {
  private readonly logger = new Logger(UpdateWorkspaceMemberRoleUseCase.name);

  constructor(
    private readonly membersRepository: WorkspaceMembersRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly profiles: WorkspaceMemberProfilesService,
    private readonly context: ContextService,
  ) {}

  // The caller's admin role and the admin count are read after the workspace
  // row is locked: there is no org-wide way to repair a workspace without
  // admins, so concurrent changes must not both pass on stale reads.
  @Transactional()
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: UpdateWorkspaceMemberRoleCommand,
  ): Promise<WorkspaceMemberProfile> {
    const { workspaceId, userId, role } = command;
    this.logger.log(
      { workspaceId, userId, role },
      'Updating workspace member role',
    );

    const { orgId } = getRequiredUserContext(this.context);
    await this.membersRepository.lockWorkspace(workspaceId, orgId);
    await this.workspaceAccess.requireAdmin(workspaceId);
    const member = await this.membersRepository.findOne(workspaceId, userId);
    if (!member) throw new WorkspaceMemberNotFoundError(workspaceId, userId);

    if (member.role !== role) {
      await this.assertAnotherAdminRemains(member);
      await this.membersRepository.updateRole(workspaceId, userId, role);
      member.role = role;
    }
    const [profile] = await this.profiles.load([member]);
    return profile;
  }

  private async assertAnotherAdminRemains(
    member: WorkspaceMember,
  ): Promise<void> {
    if (member.role !== UserRole.ADMIN) return;
    const admins = await this.membersRepository.countAdmins(member.workspaceId);
    if (admins > 1) return;
    throw new WorkspaceLastAdminError(member.workspaceId);
  }
}
