import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';

const ACCESS_LEVEL_RANK: Record<WorkspaceAccessLevel, number> = {
  [WorkspaceAccessLevel.USE]: 1,
  [WorkspaceAccessLevel.EDIT]: 2,
  [WorkspaceAccessLevel.FULL]: 3,
};

export interface DirectMembershipCandidate {
  accessLevel: WorkspaceAccessLevel;
  status: WorkspaceMemberStatus;
}

export interface TeamMemberOverrideCandidate {
  accessLevel: WorkspaceAccessLevel | null;
  excluded: boolean;
}

export interface TeamGrantCandidate {
  teamId: UUID;
  accessLevel: WorkspaceAccessLevel;
  override?: TeamMemberOverrideCandidate;
}

export type WorkspaceAccessSource =
  | { type: 'owner' }
  | { type: 'direct' }
  | { type: 'team'; teamId: UUID }
  | { type: 'organization' };

export interface WorkspaceAccessResolution {
  accessLevel: WorkspaceAccessLevel;
  sources: WorkspaceAccessSource[];
}

export interface WorkspaceAccessCandidates {
  isOwner?: boolean;
  directMembership?: DirectMembershipCandidate;
  teamGrants?: TeamGrantCandidate[];
  organizationVisible?: boolean;
}

interface AccessLevelCandidate {
  accessLevel: WorkspaceAccessLevel;
  source: WorkspaceAccessSource;
}

@Injectable()
export class WorkspaceAccessPolicyService {
  resolve(
    candidates: WorkspaceAccessCandidates,
  ): WorkspaceAccessResolution | null {
    if (candidates.isOwner) {
      return {
        accessLevel: WorkspaceAccessLevel.FULL,
        sources: [{ type: 'owner' }],
      };
    }
    const accessLevelCandidates = this.collectAccessLevelCandidates(candidates);
    if (accessLevelCandidates.length === 0) return null;
    return {
      accessLevel: this.highestAccessLevel(accessLevelCandidates),
      sources: accessLevelCandidates.map(({ source }) => source),
    };
  }

  hasMinimumAccessLevel(
    actual: WorkspaceAccessLevel,
    required: WorkspaceAccessLevel,
  ): boolean {
    return ACCESS_LEVEL_RANK[actual] >= ACCESS_LEVEL_RANK[required];
  }

  private collectAccessLevelCandidates(
    candidates: WorkspaceAccessCandidates,
  ): AccessLevelCandidate[] {
    const result: AccessLevelCandidate[] = [];
    const direct = candidates.directMembership;
    if (direct?.status === WorkspaceMemberStatus.ACTIVE) {
      result.push({
        accessLevel: direct.accessLevel,
        source: { type: 'direct' },
      });
    }
    for (const teamGrant of candidates.teamGrants ?? []) {
      if (teamGrant.override?.excluded) continue;
      result.push({
        accessLevel: teamGrant.override?.accessLevel ?? teamGrant.accessLevel,
        source: { type: 'team', teamId: teamGrant.teamId },
      });
    }
    if (candidates.organizationVisible) {
      result.push({
        accessLevel: WorkspaceAccessLevel.USE,
        source: { type: 'organization' },
      });
    }
    return result;
  }

  private highestAccessLevel(
    candidates: AccessLevelCandidate[],
  ): WorkspaceAccessLevel {
    return candidates.reduce(
      (highest, candidate) =>
        ACCESS_LEVEL_RANK[candidate.accessLevel] > ACCESS_LEVEL_RANK[highest]
          ? candidate.accessLevel
          : highest,
      candidates[0].accessLevel,
    );
  }
}
