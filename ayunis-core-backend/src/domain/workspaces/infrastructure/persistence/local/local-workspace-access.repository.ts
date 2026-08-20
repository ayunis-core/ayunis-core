import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { UUID } from 'crypto';
import {
  WorkspaceAccessRepository,
  type FindWorkspaceAccessParams,
  type WorkspaceAccessSnapshot,
} from 'src/domain/workspaces/application/ports/workspace-access-repository.port';
import type { TeamGrantCandidate } from 'src/domain/workspaces/application/services/workspace-access-policy.service';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from './schema/workspace-team-member-override.record';

@Injectable()
export class LocalWorkspaceAccessRepository extends WorkspaceAccessRepository {
  constructor(
    @InjectRepository(WorkspaceRecord)
    private readonly workspaceRepo: Repository<WorkspaceRecord>,
    @InjectRepository(WorkspaceMemberRecord)
    private readonly memberRepo: Repository<WorkspaceMemberRecord>,
    @InjectRepository(WorkspaceTeamGrantRecord)
    private readonly teamGrantRepo: Repository<WorkspaceTeamGrantRecord>,
    @InjectRepository(WorkspaceTeamMemberOverrideRecord)
    private readonly overrideRepo: Repository<WorkspaceTeamMemberOverrideRecord>,
    private readonly mapper: WorkspaceMapper,
  ) {
    super();
  }

  async findAccessSnapshot(
    params: FindWorkspaceAccessParams,
  ): Promise<WorkspaceAccessSnapshot | null> {
    const workspaceRecord = await this.workspaceRepo.findOne({
      where: { id: params.workspaceId, orgId: params.orgId },
    });
    if (!workspaceRecord) return null;

    const [member, teamGrants] = await Promise.all([
      this.memberRepo.findOne({
        where: { workspaceId: params.workspaceId, userId: params.userId },
      }),
      this.findTeamGrants(params.workspaceId, params.teamIds),
    ]);
    const overrides = await this.findOverrides(teamGrants, params.userId);

    return {
      workspace: this.mapper.toDomain(workspaceRecord),
      directMembership: member
        ? { role: member.role, status: member.status }
        : undefined,
      teamGrants: teamGrants.map((grant) => ({
        teamId: grant.teamId,
        role: grant.role,
        override: overrides.get(grant.id),
      })),
    };
  }

  private async findTeamGrants(
    workspaceId: UUID,
    teamIds: UUID[],
  ): Promise<WorkspaceTeamGrantRecord[]> {
    if (teamIds.length === 0) return [];
    return this.teamGrantRepo.find({
      where: { workspaceId, teamId: In(teamIds) },
    });
  }

  private async findOverrides(
    teamGrants: WorkspaceTeamGrantRecord[],
    userId: UUID,
  ): Promise<Map<UUID, TeamGrantCandidate['override']>> {
    if (teamGrants.length === 0) return new Map();
    const records = await this.overrideRepo.find({
      where: { teamGrantId: In(teamGrants.map(({ id }) => id)), userId },
    });
    return new Map(
      records.map((record) => [
        record.teamGrantId,
        { role: record.role, excluded: record.excluded },
      ]),
    );
  }
}
