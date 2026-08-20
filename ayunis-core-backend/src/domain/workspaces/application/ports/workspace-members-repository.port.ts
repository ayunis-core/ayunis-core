import type { UUID } from 'crypto';
import type { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import type { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

export interface WorkspaceMember {
  workspaceId: UUID;
  userId: UUID;
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
}

export abstract class WorkspaceMembersRepository {
  abstract findMember(
    workspaceId: UUID,
    userId: UUID,
  ): Promise<WorkspaceMember | null>;

  abstract findInvitation(
    workspaceId: UUID,
    userId: UUID,
    orgId: UUID,
  ): Promise<WorkspaceMember | null>;

  abstract createMember(
    member: WorkspaceMember,
  ): Promise<WorkspaceMember | null>;

  abstract activateInvitation(
    workspaceId: UUID,
    userId: UUID,
    orgId: UUID,
  ): Promise<WorkspaceMember | null>;

  abstract declineInvitation(
    workspaceId: UUID,
    userId: UUID,
    orgId: UUID,
  ): Promise<boolean>;

  abstract updateMemberRole(
    workspaceId: UUID,
    userId: UUID,
    role: WorkspaceRole,
  ): Promise<WorkspaceMember | null>;

  abstract deleteMember(workspaceId: UUID, userId: UUID): Promise<void>;
}
