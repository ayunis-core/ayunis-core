import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { WorkspaceSharingSnapshot } from 'src/domain/workspaces/application/ports/workspace-sharing-read-repository.port';
import type { WorkspaceTeamMemberOverride } from 'src/domain/workspaces/application/ports/workspace-team-member-overrides-repository.port';
import { WorkspaceMemberRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-member.record';
import { WorkspaceTeamGrantRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from 'src/domain/workspaces/infrastructure/persistence/local/schema/workspace-team-member-override.record';
import { WorkspaceMemberMapper } from './workspace-member.mapper';
import { WorkspaceTeamGrantMapper } from './workspace-team-grant.mapper';
import { WorkspaceTeamMemberOverrideMapper } from './workspace-team-member-override.mapper';

@Injectable()
export class WorkspaceSharingMapper {
  constructor(
    private readonly memberMapper: WorkspaceMemberMapper,
    private readonly grantMapper: WorkspaceTeamGrantMapper,
    private readonly overrideMapper: WorkspaceTeamMemberOverrideMapper,
  ) {}

  toSnapshot(
    members: WorkspaceMemberRecord[],
    grants: WorkspaceTeamGrantRecord[],
    overrides: WorkspaceTeamMemberOverrideRecord[],
  ): WorkspaceSharingSnapshot {
    const overridesByGrantId = this.groupOverrides(overrides);
    return {
      members: members.map((record) => this.memberMapper.toDomain(record)),
      teamGrants: grants.map((record) => ({
        id: record.id,
        ...this.grantMapper.toDomain(record),
        overrides: overridesByGrantId.get(record.id) ?? [],
      })),
    };
  }

  private groupOverrides(
    records: WorkspaceTeamMemberOverrideRecord[],
  ): Map<UUID, WorkspaceTeamMemberOverride[]> {
    const result = new Map<UUID, WorkspaceTeamMemberOverride[]>();
    for (const record of records) {
      const overrides = result.get(record.teamGrantId) ?? [];
      overrides.push(this.overrideMapper.toDomain(record));
      result.set(record.teamGrantId, overrides);
    }
    return result;
  }
}
