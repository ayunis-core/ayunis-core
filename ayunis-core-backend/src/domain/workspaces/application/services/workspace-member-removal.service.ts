import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspaceMemberRemovedEvent } from 'src/domain/workspaces/application/events/workspace-member-removed.event';
import type { WorkspaceAccess } from 'src/domain/workspaces/application/models/workspace-access.model';
import { WorkspaceMembersRepository } from 'src/domain/workspaces/application/ports/workspace-members-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import {
  WorkspaceLastAdminError,
  WorkspaceMemberNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import type { WorkspaceMember } from 'src/domain/workspaces/domain/workspace-member.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { UserRole } from 'src/iam/users/domain/value-objects/role.object';

/**
 * Ends a membership, whether a member leaves or is removed. Any member may
 * leave; removing someone else needs `manage_workspace_members`, and only
 * admins remove admins. A workspace always keeps an admin.
 */
@Injectable()
export class WorkspaceMemberRemovalService {
  constructor(
    private readonly membersRepository: WorkspaceMembersRepository,
    private readonly workspaceAccess: WorkspaceAccessService,
    private readonly eventEmitter: EventEmitter2,
    private readonly context: ContextService,
  ) {}

  async remove(workspaceId: UUID, userId: UUID): Promise<void> {
    const { orgId } = getRequiredUserContext(this.context);
    await this.removeLocked(workspaceId, userId, orgId);
    // Published after the commit, so listeners never act on a removal that
    // was rolled back.
    await this.eventEmitter.emitAsync(
      WorkspaceMemberRemovedEvent.EVENT_NAME,
      new WorkspaceMemberRemovedEvent(workspaceId, userId, orgId),
    );
  }

  // The caller's role and the admin count are read after the workspace row is
  // locked, as for role changes: two admins leaving at once must not both pass.
  @Transactional()
  private async removeLocked(
    workspaceId: UUID,
    userId: UUID,
    orgId: UUID,
  ): Promise<void> {
    await this.membersRepository.lockWorkspace(workspaceId, orgId);
    const access = await this.workspaceAccess.requireMember(workspaceId);
    const member = await this.membersRepository.findOne(workspaceId, userId);
    if (!member) throw new WorkspaceMemberNotFoundError(workspaceId, userId);

    this.assertMayRemove(access, member);
    await this.assertAnotherAdminRemains(member);
    await this.membersRepository.delete(workspaceId, userId);
  }

  private assertMayRemove(access: WorkspaceAccess, member: WorkspaceMember) {
    const { userId } = getRequiredUserContext(this.context);
    if (member.userId === userId) return;
    const allowed =
      member.role === UserRole.ADMIN
        ? access.isAdmin
        : access.can(Permission.MANAGE_WORKSPACE_MEMBERS);
    if (!allowed) throw new UnauthorizedAccessError();
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
