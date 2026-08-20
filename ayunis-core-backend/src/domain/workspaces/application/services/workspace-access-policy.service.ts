import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceRole } from 'src/domain/workspaces/domain/value-objects/workspace-role.enum';

const ROLE_RANK: Record<WorkspaceRole, number> = {
  [WorkspaceRole.USE]: 1,
  [WorkspaceRole.EDIT]: 2,
  [WorkspaceRole.FULL]: 3,
};

export interface DirectMembershipCandidate {
  role: WorkspaceRole;
  status: WorkspaceMemberStatus;
}

export interface TeamMemberOverrideCandidate {
  role: WorkspaceRole | null;
  excluded: boolean;
}

export interface TeamGrantCandidate {
  teamId: UUID;
  role: WorkspaceRole;
  override?: TeamMemberOverrideCandidate;
}

export type WorkspaceAccessSource =
  | { type: 'owner' }
  | { type: 'direct' }
  | { type: 'team'; teamId: UUID }
  | { type: 'organization' };

export interface WorkspaceAccessResolution {
  role: WorkspaceRole;
  sources: WorkspaceAccessSource[];
}

export interface WorkspaceAccessCandidates {
  isOwner?: boolean;
  directMembership?: DirectMembershipCandidate;
  teamGrants?: TeamGrantCandidate[];
  organizationVisible?: boolean;
}

interface RoleCandidate {
  role: WorkspaceRole;
  source: WorkspaceAccessSource;
}

@Injectable()
export class WorkspaceAccessPolicyService {
  resolve(
    candidates: WorkspaceAccessCandidates,
  ): WorkspaceAccessResolution | null {
    if (candidates.isOwner) {
      return { role: WorkspaceRole.FULL, sources: [{ type: 'owner' }] };
    }
    const roleCandidates = this.collectRoleCandidates(candidates);
    if (roleCandidates.length === 0) return null;
    return {
      role: this.highestRole(roleCandidates),
      sources: roleCandidates.map(({ source }) => source),
    };
  }

  hasMinimumRole(actual: WorkspaceRole, required: WorkspaceRole): boolean {
    return ROLE_RANK[actual] >= ROLE_RANK[required];
  }

  private collectRoleCandidates(
    candidates: WorkspaceAccessCandidates,
  ): RoleCandidate[] {
    const result: RoleCandidate[] = [];
    const direct = candidates.directMembership;
    if (direct?.status === WorkspaceMemberStatus.ACTIVE) {
      result.push({ role: direct.role, source: { type: 'direct' } });
    }
    for (const teamGrant of candidates.teamGrants ?? []) {
      if (teamGrant.override?.excluded) continue;
      result.push({
        role: teamGrant.override?.role ?? teamGrant.role,
        source: { type: 'team', teamId: teamGrant.teamId },
      });
    }
    if (candidates.organizationVisible) {
      result.push({
        role: WorkspaceRole.USE,
        source: { type: 'organization' },
      });
    }
    return result;
  }

  private highestRole(candidates: RoleCandidate[]): WorkspaceRole {
    return candidates.reduce(
      (highest, candidate) =>
        ROLE_RANK[candidate.role] > ROLE_RANK[highest]
          ? candidate.role
          : highest,
      candidates[0].role,
    );
  }
}
