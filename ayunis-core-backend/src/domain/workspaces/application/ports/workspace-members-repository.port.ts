import type { UUID } from 'crypto';
import type { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import type { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

export interface WorkspaceMember {
  workspaceId: UUID;
  userId: UUID;
  accessLevel: WorkspaceAccessLevel;
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

  abstract updateMemberAccessLevel(
    workspaceId: UUID,
    userId: UUID,
    accessLevel: WorkspaceAccessLevel,
  ): Promise<WorkspaceMember | null>;

  abstract deleteMember(workspaceId: UUID, userId: UUID): Promise<void>;
}
