import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { UUID } from 'crypto';
import {
  WorkspaceAccessRepository,
  type FindWorkspaceAccessListParams,
  type FindWorkspaceAccessParams,
  type WorkspaceAccessSnapshot,
} from 'src/domain/workspaces/application/ports/workspace-access-repository.port';
import type { TeamGrantCandidate } from 'src/domain/workspaces/application/services/workspace-access-policy.service';
import type { WorkspaceListOptions } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceMemberStatus } from 'src/domain/workspaces/domain/value-objects/workspace-member-status.enum';
import { WorkspaceVisibility } from 'src/domain/workspaces/domain/value-objects/workspace-visibility.enum';
import { WorkspaceMapper } from './mappers/workspace.mapper';
import { WorkspaceMemberRecord } from './schema/workspace-member.record';
import { WorkspaceRecord } from './schema/workspace.record';
import { WorkspaceTeamGrantRecord } from './schema/workspace-team-grant.record';
import { WorkspaceTeamMemberOverrideRecord } from './schema/workspace-team-member-override.record';
import {
  applyWorkspaceSearch,
  applyWorkspaceSort,
  joinWorkspaceActivity,
} from './workspace-list-query.helpers';

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
        ? { accessLevel: member.accessLevel, status: member.status }
        : undefined,
      teamGrants: teamGrants.map((grant) => ({
        teamId: grant.teamId,
        accessLevel: grant.accessLevel,
        override: overrides.get(grant.id),
      })),
    };
  }

  async findAccessSnapshots(
    params: FindWorkspaceAccessListParams,
    query: WorkspaceListOptions,
  ): Promise<Paginated<WorkspaceAccessSnapshot>> {
    const listQuery = this.createAccessListQuery(params, query);
    const countQuery = this.createAccessCountQuery(params, query);
    const [records, total] = await Promise.all([
      listQuery.skip(query.offset).take(query.limit).getMany(),
      countQuery.getCount(),
    ]);
    const snapshots = await this.hydrateSnapshots(records, params);
    return new Paginated({
      data: snapshots,
      limit: query.limit,
      offset: query.offset,
      total,
    });
  }

  async findAccessSnapshotsByIds(
    params: FindWorkspaceAccessListParams,
    workspaceIds: UUID[],
  ): Promise<WorkspaceAccessSnapshot[]> {
    if (workspaceIds.length === 0) return [];
    const records = await this.createAccessBaseQuery(params)
      .andWhere('workspace.id IN (:...workspaceIds)', { workspaceIds })
      .getMany();
    return this.hydrateSnapshots(records, params);
  }

  private createAccessListQuery(
    params: FindWorkspaceAccessListParams,
    query: WorkspaceListOptions,
  ): SelectQueryBuilder<WorkspaceRecord> {
    let builder = this.createAccessBaseQuery(params);
    if (query.sort === 'updatedAt') {
      builder = joinWorkspaceActivity(builder);
    }
    applyWorkspaceSearch(builder, query.search);
    applyWorkspaceSort(builder, query.sort);
    return builder.addOrderBy('workspace.id', 'ASC');
  }

  private createAccessCountQuery(
    params: FindWorkspaceAccessListParams,
    query: Pick<WorkspaceListOptions, 'search'>,
  ): SelectQueryBuilder<WorkspaceRecord> {
    const builder = this.createAccessBaseQuery(params);
    applyWorkspaceSearch(builder, query.search);
    return builder;
  }

  private createAccessBaseQuery(
    params: FindWorkspaceAccessListParams,
  ): SelectQueryBuilder<WorkspaceRecord> {
    return this.workspaceRepo
      .createQueryBuilder('workspace')
      .where('workspace."orgId" = :orgId', { orgId: params.orgId })
      .andWhere(this.accessCondition(params), {
        userId: params.userId,
        visibility: WorkspaceVisibility.ORGANIZATION,
        activeStatus: WorkspaceMemberStatus.ACTIVE,
        teamIds: params.teamIds,
      });
  }

  private accessCondition(params: FindWorkspaceAccessListParams): string {
    const direct = `EXISTS (
      SELECT 1 FROM workspace_members member
      WHERE member."workspaceId" = workspace.id
        AND member."userId" = :userId
        AND member.status = :activeStatus
    )`;
    const sources = [
      'workspace."userId" = :userId',
      'workspace.visibility = :visibility',
      direct,
    ];
    if (params.teamIds.length > 0) {
      sources.push(`EXISTS (
        SELECT 1 FROM workspace_team_grants team_grant
        LEFT JOIN workspace_team_member_overrides member_override
          ON member_override."teamGrantId" = team_grant.id
          AND member_override."userId" = :userId
        WHERE team_grant."workspaceId" = workspace.id
          AND team_grant."teamId" IN (:...teamIds)
          AND COALESCE(member_override.excluded, false) = false
      )`);
    }
    return `(${sources.join(' OR ')})`;
  }

  private async hydrateSnapshots(
    records: WorkspaceRecord[],
    params: FindWorkspaceAccessListParams,
  ): Promise<WorkspaceAccessSnapshot[]> {
    if (records.length === 0) return [];
    const workspaceIds = records.map(({ id }) => id);
    const [members, teamGrants] = await Promise.all([
      this.memberRepo.find({
        where: { workspaceId: In(workspaceIds), userId: params.userId },
      }),
      params.teamIds.length === 0
        ? []
        : this.teamGrantRepo.find({
            where: {
              workspaceId: In(workspaceIds),
              teamId: In(params.teamIds),
            },
          }),
    ]);
    const overrides = await this.findOverrides(teamGrants, params.userId);
    const membersByWorkspaceId = new Map(
      members.map((member) => [member.workspaceId, member]),
    );
    const grantsByWorkspaceId = this.groupTeamGrants(teamGrants);
    return records.map((record) => ({
      workspace: this.mapper.toDomain(record),
      directMembership: this.mapMember(membersByWorkspaceId.get(record.id)),
      teamGrants: (grantsByWorkspaceId.get(record.id) ?? []).map((grant) => ({
        teamId: grant.teamId,
        accessLevel: grant.accessLevel,
        override: overrides.get(grant.id),
      })),
    }));
  }

  private mapMember(
    member?: WorkspaceMemberRecord,
  ): WorkspaceAccessSnapshot['directMembership'] {
    return member
      ? { accessLevel: member.accessLevel, status: member.status }
      : undefined;
  }

  private groupTeamGrants(
    grants: WorkspaceTeamGrantRecord[],
  ): Map<UUID, WorkspaceTeamGrantRecord[]> {
    const grantsByWorkspaceId = new Map<UUID, WorkspaceTeamGrantRecord[]>();
    for (const grant of grants) {
      const workspaceGrants = grantsByWorkspaceId.get(grant.workspaceId) ?? [];
      workspaceGrants.push(grant);
      grantsByWorkspaceId.set(grant.workspaceId, workspaceGrants);
    }
    return grantsByWorkspaceId;
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
        { accessLevel: record.accessLevel, excluded: record.excluded },
      ]),
    );
  }
}
