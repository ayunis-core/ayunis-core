import type { UUID } from 'crypto';
import type { NamedPerson } from 'src/domain/ownership/application/models/owner-names';
import type { Workspace } from './workspace.entity';

export interface WorkspaceLinkRef {
  workspaceId: UUID;
  linkedByUserId: UUID | null;
}

export interface LinkedWorkspaces {
  total: number;
  workspaces: { workspace: Workspace; linkedBy: NamedPerson | null }[];
}
