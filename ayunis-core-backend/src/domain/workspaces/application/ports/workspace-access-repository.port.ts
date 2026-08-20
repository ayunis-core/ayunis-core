import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { WorkspaceListOptions } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import type { Workspace } from 'src/domain/workspaces/domain/workspace.entity';
import type {
  DirectMembershipCandidate,
  TeamGrantCandidate,
} from 'src/domain/workspaces/application/services/workspace-access-policy.service';

export interface FindWorkspaceAccessParams {
  workspaceId: UUID;
  orgId: UUID;
  userId: UUID;
  teamIds: UUID[];
}

export interface FindWorkspaceAccessListParams {
  orgId: UUID;
  userId: UUID;
  teamIds: UUID[];
}

export interface WorkspaceAccessSnapshot {
  workspace: Workspace;
  directMembership?: DirectMembershipCandidate;
  teamGrants: TeamGrantCandidate[];
}

export abstract class WorkspaceAccessRepository {
  abstract findAccessSnapshot(
    params: FindWorkspaceAccessParams,
  ): Promise<WorkspaceAccessSnapshot | null>;

  abstract findAccessSnapshots(
    params: FindWorkspaceAccessListParams,
    query: WorkspaceListOptions,
  ): Promise<Paginated<WorkspaceAccessSnapshot>>;

  abstract findAccessSnapshotsByIds(
    params: FindWorkspaceAccessListParams,
    workspaceIds: UUID[],
  ): Promise<WorkspaceAccessSnapshot[]>;
}
